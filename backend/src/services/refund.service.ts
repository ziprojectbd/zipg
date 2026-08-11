import crypto from 'node:crypto';
import { Refund, Transaction } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';

interface CreateRefundInput {
  transactionId: string;
  amount: number;
  reason: string;
  processedBy?: string;
}

interface RefundListQuery {
  page?: number;
  limit?: number;
  status?: string;
  transactionId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Create a new refund request for a completed transaction.
 *
 * Validates the transaction exists with 'paid' status and ensures the total
 * refunded amount (including existing refunds) does not exceed the original
 * transaction amount. The refund is created with status 'requested' — no
 * transaction status change occurs until the refund is explicitly processed.
 */
export async function createRefund(input: CreateRefundInput) {
  const transaction = await Transaction.findOne({ transactionId: input.transactionId });

  if (!transaction) {
    throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
  }

  if (transaction.status !== 'paid') {
    throw new AppError(
      'Refund is only allowed for completed (paid) transactions',
      400,
      'REFUND_NOT_ALLOWED'
    );
  }

  if (input.amount <= 0) {
    throw new AppError('Refund amount must be greater than zero', 400, 'INVALID_AMOUNT');
  }

  // Sum existing successful or processing refunds to prevent over-refunding
  const existingRefunds = await Refund.aggregate([
    {
      $match: {
        transactionId: input.transactionId,
        status: { $in: ['requested', 'processing', 'success'] },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const alreadyRefunded = existingRefunds[0]?.total || 0;
  const remaining = transaction.amount - alreadyRefunded;

  if (input.amount > remaining) {
    throw new AppError(
      `Refund amount of ${input.amount} exceeds the refundable amount of ${remaining}`,
      400,
      'REFUND_EXCEEDS_AMOUNT'
    );
  }

  const refundId = `REF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const refund = await Refund.create({
    refundId,
    transactionId: input.transactionId,
    amount: input.amount,
    reason: input.reason,
    processedBy: input.processedBy,
    status: 'requested',
  });

  await createActivityLog({
    action: 'refund_requested',
    message: `Refund requested: ${refundId} for ${input.amount} ${transaction.currency} (transaction ${input.transactionId})`,
    entityType: 'Refund',
    entityId: refundId,
    severity: 'info',
    metadata: {
      transactionId: input.transactionId,
      amount: input.amount,
      reason: input.reason,
      processedBy: input.processedBy,
    },
  });

  return refund;
}

/**
 * Retrieve a single refund by its unique refundId.
 *
 * @throws {AppError} 404 if the refund does not exist.
 */
export async function getRefund(refundId: string) {
  const refund = await Refund.findOne({ refundId }).lean();

  if (!refund) {
    throw new AppError('Refund not found', 404, 'REFUND_NOT_FOUND');
  }

  return refund;
}

/**
 * List refunds with pagination and optional filters.
 *
 * Supports filtering by status, transactionId, date range, and a free-text
 * search across refundId and reason. Returns results sorted newest-first
 * along with pagination metadata — same shape as `listPayments`.
 */
export async function listRefunds(query: RefundListQuery) {
  const filter: Record<string, unknown> = {};

  if (query.status) filter.status = query.status;
  if (query.transactionId) filter.transactionId = query.transactionId;

  if (query.search) {
    filter.$or = [
      { refundId: { $regex: query.search, $options: 'i' } },
      { reason: { $regex: query.search, $options: 'i' } },
      { transactionId: { $regex: query.search, $options: 'i' } },
    ];
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate)
      (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
    if (query.endDate)
      (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [refunds, total] = await Promise.all([
    Refund.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Refund.countDocuments(filter),
  ]);

  return {
    refunds,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Approve or reject a requested refund.
 *
 * - **approve**: transitions through `requested` → `processing` → `success`,
 *   recording `processedAt` on the refund document.
 * - **reject**: sets status to `failed` with the provided `notes` as
 *   `failureReason`.
 *
 * An activity log entry is created for every state transition so the
 * full audit trail is preserved.
 *
 * @throws {AppError} 400 if the refund is not in 'requested' status.
 * @throws {AppError} 404 if the refund does not exist.
 */
export async function processRefund(
  refundId: string,
  adminId: string,
  action: 'approve' | 'reject',
  notes?: string
) {
  const refund = await Refund.findOne({ refundId });

  if (!refund) {
    throw new AppError('Refund not found', 404, 'REFUND_NOT_FOUND');
  }

  if (refund.status !== 'requested') {
    throw new AppError(
      `Cannot process refund with status '${refund.status}' — only 'requested' refunds can be processed`,
      400,
      'INVALID_REFUND_STATUS'
    );
  }

  if (action === 'approve') {
    // Transition to processing
    refund.status = 'processing';
    await refund.save();

    await createActivityLog({
      action: 'refund_approved',
      message: `Refund ${refundId} approved by admin ${adminId}`,
      entityType: 'Refund',
      entityId: refundId,
      severity: 'info',
      metadata: { adminId, transactionId: refund.transactionId, amount: refund.amount },
    });

    // Transition to success (simulates completion of the provider callback)
    refund.status = 'success';
    refund.processedAt = new Date();
    refund.adminNotes = notes || 'Approved and processed';
    await refund.save();

    await createActivityLog({
      action: 'refund_completed',
      message: `Refund ${refundId} completed successfully (${refund.amount})`,
      entityType: 'Refund',
      entityId: refundId,
      severity: 'info',
      metadata: { adminId, transactionId: refund.transactionId, amount: refund.amount },
    });

    // Append note on the parent transaction for traceability
    await Transaction.updateOne(
      { transactionId: refund.transactionId },
      {
        $set: {
          notes: `[${new Date().toISOString()}] Refund ${refundId} completed — ${refund.amount} refunded to customer`,
        },
      }
    );
  } else {
    // Reject
    refund.status = 'failed';
    refund.failureReason = notes || 'Rejected by admin';
    await refund.save();

    await createActivityLog({
      action: 'refund_rejected',
      message: `Refund ${refundId} rejected by admin ${adminId}: ${refund.failureReason}`,
      entityType: 'Refund',
      entityId: refundId,
      severity: 'warning',
      metadata: { adminId, transactionId: refund.transactionId, amount: refund.amount, failureReason: refund.failureReason },
    });

    // Append note on the parent transaction
    await Transaction.updateOne(
      { transactionId: refund.transactionId },
      {
        $set: {
          notes: `[${new Date().toISOString()}] Refund ${refundId} rejected — ${refund.failureReason}`,
        },
      }
    );
  }

  return refund;
}

/**
 * Cancel a refund that is still in 'requested' or 'processing' state.
 *
 * Once cancelled the refund cannot be re-activated — a new refund request
 * must be created instead.
 *
 * @throws {AppError} 400 if the refund status is not cancellable.
 * @throws {AppError} 404 if the refund does not exist.
 */
export async function cancelRefund(refundId: string, adminId: string, reason?: string) {
  const refund = await Refund.findOne({ refundId });

  if (!refund) {
    throw new AppError('Refund not found', 404, 'REFUND_NOT_FOUND');
  }

  if (refund.status !== 'requested' && refund.status !== 'processing') {
    throw new AppError(
      `Cannot cancel refund with status '${refund.status}'`,
      400,
      'REFUND_NOT_CANCELLABLE'
    );
  }

  refund.status = 'cancelled';
  refund.adminNotes = reason || 'Cancelled by admin';
  await refund.save();

  await createActivityLog({
    action: 'refund_cancelled',
    message: `Refund ${refundId} cancelled by admin ${adminId}${reason ? `: ${reason}` : ''}`,
    entityType: 'Refund',
    entityId: refundId,
    severity: 'info',
    metadata: {
      adminId,
      transactionId: refund.transactionId,
      amount: refund.amount,
      reason: reason || 'Cancelled by admin',
    },
  });

  return refund;
}

/**
 * Aggregate high-level refund statistics.
 *
 * Returns total counts and summed amounts broken down by status, plus a
 * convenience `totalRefunded` that sums only the successfully completed
 * refunds. Follows the same structural pattern as `getPaymentStats()`.
 */
export async function getRefundStats() {
  const [statusCounts, totalRefundedAgg, totalCount] = await Promise.all([
    Refund.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]),
    Refund.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Refund.countDocuments(),
  ]);

  const byStatus: Record<string, { count: number; amount: number }> = {};
  for (const entry of statusCounts) {
    byStatus[entry._id] = { count: entry.count, amount: entry.amount };
  }

  return {
    totalRefunds: totalCount,
    totalRefundedAmount: totalRefundedAgg[0]?.total || 0,
    byStatus,
  };
}

/**
 * Calculate how much of a transaction's original amount is still eligible
 * for a refund.
 *
 * Sums all refunds that are in a non-terminal-failure state (`requested`,
 * `processing`, or `success`) to determine the amount already committed to
 * or completed as refunds.
 *
 * @throws {AppError} 404 if the transaction does not exist.
 * @throws {AppError} 400 if the transaction is not in 'paid' status.
 */
export async function getRefundableAmount(transactionId: string) {
  const transaction = await Transaction.findOne({ transactionId }).lean();

  if (!transaction) {
    throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
  }

  if (transaction.status !== 'paid') {
    throw new AppError(
      'Refundable amount is only available for completed (paid) transactions',
      400,
      'REFUND_NOT_ALLOWED'
    );
  }

  const refundedAgg = await Refund.aggregate([
    {
      $match: {
        transactionId,
        status: { $in: ['requested', 'processing', 'success'] },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const refundedAmount = refundedAgg[0]?.total || 0;

  return {
    originalAmount: transaction.amount,
    refundedAmount,
    refundableAmount: Math.max(transaction.amount - refundedAmount, 0),
  };
}
