/**
 * One-time migration — run at server startup.
 *
 * Backfills `publicInvoiceId` and `secureTokenHash` on any existing
 * `PaymentRequest` documents that were created before the secure-invoice
 * upgrade. Already-paid, expired, and cancelled documents are left
 * untouched — we never invalidate a transaction the customer completed.
 *
 * The migration is idempotent: documents that already have these fields
 * are skipped, so multiple server restarts are safe.
 */
import { PaymentRequest } from '../models/index.js';
import { generateSecureInvoiceFields } from '../services/invoice.service.js';
import { createActivityLog } from '../services/activityLog.service.js';

const BATCH_SIZE = 200;

/**
 * Find all PaymentRequest documents without `publicInvoiceId` (legacy docs)
 * that are NOT in a terminal (paid/expired/cancelled) state. These are the
 * only documents we need to backfill — completed transactions keep their
 * original URLs working.
 */
async function findLegacyCount(): Promise<number> {
  return PaymentRequest.countDocuments({
    publicInvoiceId: { $exists: false },
    status: { $nin: ['paid', 'expired', 'cancelled', 'failed'] },
  });
}

/**
 * Backfill a single batch of legacy documents. Each batch is processed
 * independently so the server can safely be restarted mid-migration.
 * Returns the number of documents successfully updated in this batch.
 */
async function migrateBatch(): Promise<number> {
  const docs = await PaymentRequest.find({
    publicInvoiceId: { $exists: false },
    status: { $nin: ['paid', 'expired', 'cancelled', 'failed'] },
  })
    .select({ _id: 1, requestId: 1 })
    .limit(BATCH_SIZE)
    .lean();

  if (docs.length === 0) return 0;

  let updated = 0;
  for (const doc of docs) {
    try {
      const secure = await generateSecureInvoiceFields({ requestId: doc.requestId });

      await PaymentRequest.updateOne(
        { _id: doc._id },
        {
          $set: {
            publicInvoiceId: secure.publicInvoiceId,
            secureTokenHash: secure.secureTokenHash,
            invoiceCreatedAt: secure.invoiceCreatedAt,
            invoiceExpiresAt: secure.invoiceExpiresAt,
          },
        }
      );
      updated += 1;
    } catch (err) {
      console.error(`[zi-pay] Failed to migrate invoice ${doc.requestId}:`, err);
    }
  }
  return updated;
}

/**
 * Run the legacy invoice migration. Called once at server startup after
 * database connection is established. Reports progress to the console and
 * creates a system activity log on completion.
 */
export async function migrateLegacyInvoices(): Promise<void> {
  const total = await findLegacyCount();
  if (total === 0) {
    console.log('[zi-pay] No legacy invoices to migrate');
    return;
  }

  console.log(`[zi-pay] Migrating ${total} legacy invoices (secure invoice backfill)...`);

  let processed = 0;
  while (processed < total) {
    const batchCount = await migrateBatch();
    processed += batchCount;
    if (batchCount === 0) break; // guard against infinite loop if all remaining fail
  }

  const message = `[zi-pay] Legacy invoice migration complete: ${processed}/${total} invoices secured`;
  console.log(message);

  await createActivityLog({
    action: 'system',
    severity: 'info',
    message,
    metadata: { total, processed, operation: 'legacy_invoice_migration' },
  }).catch(() => {}); // best-effort — don't let logging failure block startup
}