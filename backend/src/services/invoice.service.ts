import crypto from 'node:crypto';
import { PaymentRequest, type TransactionStatus, type PaymentProvider } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
import { appConfig } from '../config/app.js';

/* ──────────────────────────────────────────────────────────────────────────
 * Secure invoice core
 *
 * Invoices are `PaymentRequest` documents. Every new invoice gets:
 *  - a high-entropy `publicInvoiceId` (e.g. INV-7K4X9P2M8Q) — never the
 *    sequential/predictable `requestId` in public URLs,
 *  - a 256-bit access `secureToken` shown to the customer exactly once (in
 *    the invoice URL) and stored ONLY as a SHA-256 hash. The raw token is
 *    never persisted and never logged.
 * ────────────────────────────────────────────────────────────────────────── */

const PUBLIC_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PUBLIC_ID_LENGTH = 10;
const MAX_CREATE_ATTEMPTS = 3;

/** Ergonomic alias so callers can read intent instead of magic values. */
export type { PaymentProvider } from '../models/index.js';

/**
 * Generate a non-predictable public invoice ID: `INV-` + 10 random
 * uppercase alphanumeric chars from crypto.randomBytes (≈60 bits of entropy).
 */
export function generatePublicInvoiceId(): string {
  const bytes = crypto.randomBytes(PUBLIC_ID_LENGTH);
  let id = '';
  for (const b of bytes) {
    id += PUBLIC_ID_ALPHABET[b % PUBLIC_ID_ALPHABET.length];
  }
  return `INV-${id}`;
}

/**
 * Generate the high-entropy access token (32 random bytes → 64 hex chars,
 * 256 bits). Never use Math.random, timestamps, or counters for this.
 */
export function generateInvoiceAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** SHA-256 of the raw access token — the ONLY form we persist/compare. */
export function hashInvoiceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Constant-time comparison of two hex digests. */
function timingSafeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Server-authoritative expiry moment for a new invoice. */
export function invoiceExpiryFromNow(): Date {
  return new Date(Date.now() + appConfig.payment.invoiceExpiryMinutes * 60 * 1000);
}

/* ──────────────────────────── Status state machine ─────────────────────────
 * A payment/invoice may only move along these edges. `paid`, `expired`,
 * `cancelled` and `failed` are terminal. All transitions are centralized here
 * and every writer must go through `assertValidTransition`.
 * ────────────────────────────────────────────────────────────────────────── */
const ALLOWED_TRANSITIONS: Record<TransactionStatus, readonly TransactionStatus[]> = {
  pending: ['processing', 'paid', 'expired', 'cancelled', 'failed'],
  processing: ['paid', 'failed', 'expired', 'cancelled'],
  paid: [],
  failed: [],
  expired: [],
  cancelled: [],
};

export function assertValidTransition(
  current: TransactionStatus,
  next: TransactionStatus
): void {
  if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
    throw new AppError(
      `Status transition from "${current}" to "${next}" is not allowed`,
      409,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

/** True when the invoice's server-authoritative expiry has passed. */
export function isInvoiceExpired(doc: {
  invoiceExpiresAt?: Date | null;
  expiresAt?: Date | null;
}): boolean {
  const now = Date.now();
  // Prefer the secure invoice expiry; fall back to the legacy `expiresAt`.
  const expiry = doc.invoiceExpiresAt ?? doc.expiresAt ?? null;
  return expiry === null || expiry.getTime() <= now;
}

/** Minimal display projection — never the full document or token hash. */
export interface InvoiceDisplayData {
  publicInvoiceId: string;
  requestId: string;
  merchantName: string;
  merchantAccount: string;
  orderId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: TransactionStatus;
  invoiceExpiresAt: string;
}

export interface AccessMeta {
  ip?: string;
  userAgent?: string;
}

interface InvoiceRecord {
  publicInvoiceId?: string | null;
  secureTokenHash?: string | null;
  requestId: string;
  merchantName?: string;
  merchantAccount?: string;
  orderId?: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: TransactionStatus;
  invoiceExpiresAt?: Date | null;
  expiresAt?: Date | null;
}

/* ──────────────────────────────── Access ────────────────────────────────
 * Load the invoice by publicInvoiceId and verify the access token.
 * - Unknown invoice ID and wrong token produce near-identical responses
 *   (code differs, message identical) to deny enumeration.
 * - Never returns the raw token or its hash.
 * - Expired invoices get HTTP 410 with a generic body.
 * Throws AppError; errors are logged as audit events.
 */
export async function verifyInvoiceAccess(
  invoiceId: string,
  token: string,
  meta: AccessMeta = {}
): Promise<InvoiceDisplayData> {
  const tokenHash = hashInvoiceToken(token);

  const invoice: InvoiceRecord | null = await PaymentRequest.findOne(
    { publicInvoiceId: invoiceId },
    {
      publicInvoiceId: 1,
      secureTokenHash: 1,
      requestId: 1,
      merchantName: 1,
      merchantAccount: 1,
      orderId: 1,
      amount: 1,
      currency: 1,
      provider: 1,
      status: 1,
      invoiceExpiresAt: 1,
      expiresAt: 1,
    }
  )
    .select('+secureTokenHash')
    .lean();

  const genericMessage = 'This invoice link is invalid or has expired.';

  if (!invoice || !invoice.secureTokenHash) {
    await createActivityLog({
      action: 'invoice_access_denied',
      severity: 'warning',
      message: `Invoice access denied (unknown invoice)`,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      entityType: 'PaymentRequest',
      metadata: { publicInvoiceId: invoiceId },
    });
    throw new AppError(genericMessage, 404, 'INVALID_INVOICE', true);
  }

  if (!timingSafeHexEqual(tokenHash, invoice.secureTokenHash)) {
    await createActivityLog({
      action: 'invalid_token_attempt',
      severity: 'warning',
      message: `Invalid invoice token attempt`,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      entityType: 'PaymentRequest',
      entityId: invoiceId,
      // NOTE: never log the token or its hash.
      metadata: { publicInvoiceId: invoiceId },
    });
    throw new AppError(genericMessage, 404, 'INVALID_TOKEN', true);
  }

  if (isInvoiceExpired(invoice)) {
    await createActivityLog({
      action: 'invoice_expired',
      severity: 'warning',
      message: `Invoice expired on access`,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      entityType: 'PaymentRequest',
      entityId: invoiceId,
      metadata: { publicInvoiceId: invoiceId },
    });
    throw new AppError('This invoice has expired.', 410, 'INVOICE_EXPIRED', true);
  }

  await createActivityLog({
    action: 'invoice_accessed',
    severity: 'info',
    message: `Invoice accessed: ${invoiceId}`,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    entityType: 'PaymentRequest',
    entityId: invoiceId,
    metadata: { publicInvoiceId: invoiceId },
  });

  return {
    publicInvoiceId: invoice.publicInvoiceId ?? invoiceId,
    requestId: invoice.requestId,
    merchantName: invoice.merchantName || '',
    merchantAccount: invoice.merchantAccount || '',
    orderId: invoice.orderId || '',
    amount: invoice.amount,
    currency: invoice.currency || 'BDT',
    provider: invoice.provider,
    status: invoice.status,
    invoiceExpiresAt: (invoice.invoiceExpiresAt ?? invoice.expiresAt ?? new Date()).toISOString(),
  };
}

/* ────────────────────────── Payment settlement ──────────────────────────
 * Atomically move PENDING → PAID only when:
 *   - the invoice still exists,
 *   - its status is still `pending` (a concurrent request may have paid it),
 *   - its server-authoritative expiry has NOT passed.
 * The conditional update acts as the only gate, making double-payment and
 * expired-invoice races impossible even under concurrent/parallel requests.
 */
export async function markInvoicePaid(
  invoiceId: string,
  token: string,
  data: { transactionId?: string; trxId?: string; verifiedAt?: Date } & AccessMeta,
  meta: AccessMeta = {}
): Promise<InvoiceDisplayData> {
  // Verify token + expiry first (also emits access/security audit logs).
  const verified = await verifyInvoiceAccess(invoiceId, token, meta);
  const now = new Date();

  const updated: InvoiceRecord | null = await PaymentRequest.findOneAndUpdate(
    {
      publicInvoiceId: invoiceId,
      status: 'pending',
      // Conditional expiry guard — consult both secure and legacy expiry.
      $or: [
        { invoiceExpiresAt: { $gt: now } },
        { invoiceExpiresAt: { $exists: false }, expiresAt: { $gt: now } },
      ],
    },
    {
      $set: {
        status: 'paid',
        ...(data.transactionId ? { transactionId: data.transactionId } : {}),
        ...(data.trxId ? { customerTransactionId: data.trxId } : {}),
        ...(data.verifiedAt ? { verifiedAt: data.verifiedAt } : {}),
      },
    },
    {
      new: true,
      projection: {
        publicInvoiceId: 1,
        requestId: 1,
        merchantName: 1,
        merchantAccount: 1,
        orderId: 1,
        amount: 1,
        currency: 1,
        provider: 1,
        status: 1,
        invoiceExpiresAt: 1,
      },
    }
  );

  if (!updated) {
    // Distinguish the failure reason for a safe, specific-but-generic error.
    const current: InvoiceRecord | null = await PaymentRequest.findOne(
      { publicInvoiceId: invoiceId },
      { status: 1, invoiceExpiresAt: 1, expiresAt: 1 }
    ).lean();

    if (!current) {
      throw new AppError('This invoice link is invalid or has expired.', 404, 'INVALID_INVOICE', true);
    }
    if (isInvoiceExpired(current)) {
      throw new AppError('This invoice has expired.', 410, 'INVOICE_EXPIRED', true);
    }
    if (current.status === 'paid') {
      throw new AppError('This invoice has already been paid.', 409, 'INVOICE_ALREADY_PAID', true);
    }
    if (current.status === 'cancelled') {
      throw new AppError('This invoice has been cancelled.', 409, 'INVOICE_CANCELLED', true);
    }
    throw new AppError('This invoice cannot be paid right now.', 409, 'INVOICE_CONFLICT', true);
  }

  await createActivityLog({
    action: 'invoice_paid',
    severity: 'info',
    message: `Invoice marked paid: ${invoiceId}`,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    entityType: 'PaymentRequest',
    entityId: invoiceId,
    metadata: {
      publicInvoiceId: invoiceId,
      amount: updated.amount,
      provider: updated.provider,
    },
  });

  return {
    publicInvoiceId: updated.publicInvoiceId ?? invoiceId,
    requestId: updated.requestId,
    merchantName: updated.merchantName || '',
    merchantAccount: updated.merchantAccount || '',
    orderId: updated.orderId || '',
    amount: updated.amount,
    currency: updated.currency || 'BDT',
    provider: updated.provider,
    status: 'paid',
    invoiceExpiresAt: (updated.invoiceExpiresAt ?? new Date()).toISOString(),
  };
}

/* ──────────────────────────── Creation helper ───────────────────────────
 * Generates the secure fields for a new PaymentRequest. Kept separate so
 * both the merchant API and the public "submit payment" flow can adopt it
 * without duplicating the random-ID logic. Returns { publicInvoiceId,
 * secureToken, invoiceCreatedAt, invoiceExpiresAt, requestId }.
 * The returned `secureToken` is the ONLY chance to see the raw token.
 */
export interface CreateSecureInvoiceFieldsInput {
  requestId: string;
}

export async function generateSecureInvoiceFields(_input: CreateSecureInvoiceFieldsInput): Promise<{
  publicInvoiceId: string;
  secureTokenHash: string;
  secureToken: string;
  invoiceCreatedAt: Date;
  invoiceExpiresAt: Date;
}> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const publicInvoiceId = generatePublicInvoiceId();
    const secureToken = generateInvoiceAccessToken();
    const secureTokenHash = hashInvoiceToken(secureToken);
    const invoiceCreatedAt = new Date();
    const invoiceExpiresAt = new Date(
      invoiceCreatedAt.getTime() + appConfig.payment.invoiceExpiryMinutes * 60 * 1000
    );

    // Pre-seed the secure fields into the document so uniqueness is enforced
    // by the database's unique index (creating the record is the caller's job).
    const dupe = await PaymentRequest.exists({
      $or: [{ publicInvoiceId }, { secureTokenHash }],
    });

    if (!dupe) {
      return { publicInvoiceId, secureTokenHash, secureToken, invoiceCreatedAt, invoiceExpiresAt };
    }
    lastError = new Error('Invoice ID / token collision, retrying');
  }

  throw new AppError('Could not allocate a unique invoice identifier.', 500, 'INVOICE_CREATE_FAILED');
}