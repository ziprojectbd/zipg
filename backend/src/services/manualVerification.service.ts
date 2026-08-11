import { SmsTransaction, Transaction, PaymentRequest } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
import { emitManualVerification } from '../socket/index.js';

/* ────────── Types ────────── */

export interface VerificationQuery {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  category?: string;
}

/* ────────── List pending verifications ────────── */

export async function getPendingVerifications(query: VerificationQuery = {}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  // Default: show SMS that are parsed but not matched/verified/rejected
  const filter: Record<string, unknown> = {
    status: { $in: ['received', 'parsed'] },
  };
  if (query.status) filter.status = query.status;
  if (query.provider) filter.provider = query.provider;
  if (query.category) filter.category = query.category;

  const [items, total] = await Promise.all([
    SmsTransaction.find(filter)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SmsTransaction.countDocuments(filter),
  ]);

  return {
    verifications: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/* ────────── Manually verify an SMS transaction ────────── */

export async function verifyTransaction(
  smsTransactionId: string,
  adminId: string,
  notes?: string,
) {
  const smsDoc = await SmsTransaction.findById(smsTransactionId);
  if (!smsDoc) {
    throw new AppError('SMS transaction not found', 404, 'NOT_FOUND');
  }

  if (smsDoc.status === 'verified') {
    throw new AppError('SMS transaction is already verified', 400, 'ALREADY_VERIFIED');
  }

  if (smsDoc.status === 'rejected') {
    throw new AppError('Cannot verify a rejected transaction', 400, 'IS_REJECTED');
  }

  // Try to match a pending transaction if not already matched
  let matchedTransaction = smsDoc.matchedTransactionId
    ? await Transaction.findById(smsDoc.matchedTransactionId)
    : null;

  if (!matchedTransaction && smsDoc.parsedAmount && smsDoc.provider !== 'unknown') {
    // Try to find a pending transaction matching amount + provider
    matchedTransaction = await Transaction.findOne({
      provider: smsDoc.provider,
      amount: smsDoc.parsedAmount,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: 1 });
  }

  // Update SMS document
  smsDoc.status = 'verified';
  smsDoc.verificationMethod = 'manual';
  smsDoc.verifiedBy = adminId as any;
  smsDoc.verificationNotes = notes;
  smsDoc.verifiedAt = new Date();

  if (matchedTransaction) {
    smsDoc.matchedTransactionId = matchedTransaction._id;
    smsDoc.matchedPaymentRequestId = matchedTransaction.paymentRequestId || null;

    // Mark the Transaction as paid
    matchedTransaction.status = 'paid';
    matchedTransaction.customerTransactionId = smsDoc.parsedTxnId || matchedTransaction.customerTransactionId;
    matchedTransaction.deviceId = smsDoc.deviceId;
    matchedTransaction.smsRaw = smsDoc.rawSms;
    matchedTransaction.smsSender = smsDoc.sender;
    matchedTransaction.smsReceivedAt = smsDoc.receivedAt;
    matchedTransaction.verifiedAt = new Date();
    matchedTransaction.verificationMethod = 'manual';
    matchedTransaction.metadata = {
      ...matchedTransaction.metadata,
      manualVerifiedBy: adminId,
      manualVerifiedAt: new Date().toISOString(),
    };
    await matchedTransaction.save();

    // Update PaymentRequest if linked
    if (matchedTransaction.paymentRequestId) {
      await PaymentRequest.updateOne(
        { _id: matchedTransaction.paymentRequestId },
        { status: 'paid', transactionId: smsDoc.parsedTxnId },
      );
    }
  }

  await smsDoc.save();

  await createActivityLog({
    userId: adminId,
    action: 'payment_verified',
    message: `Manual verification: SMS ${String(smsDoc._id)} verified${matchedTransaction ? ` → ${matchedTransaction.transactionId}` : ' (no match)'}`,
    entityType: 'SmsTransaction',
    entityId: String(smsDoc._id),
    severity: 'info',
    metadata: {
      transactionId: matchedTransaction?.transactionId,
      amount: smsDoc.parsedAmount,
      provider: smsDoc.provider,
      notes,
    },
  });

  emitManualVerification({
    type: 'verified',
    smsTransactionId: String(smsDoc._id),
    transactionId: matchedTransaction?.transactionId || null,
    verifiedBy: adminId,
  });

  return {
    smsTransactionId: String(smsDoc._id),
    status: 'verified',
    matchedTransactionId: matchedTransaction?.transactionId || null,
    notes,
  };
}

/* ────────── Reject an SMS transaction ────────── */

export async function rejectTransaction(
  smsTransactionId: string,
  adminId: string,
  reason?: string,
) {
  const smsDoc = await SmsTransaction.findById(smsTransactionId);
  if (!smsDoc) {
    throw new AppError('SMS transaction not found', 404, 'NOT_FOUND');
  }

  if (smsDoc.status === 'verified') {
    throw new AppError('Cannot reject a verified transaction', 400, 'IS_VERIFIED');
  }

  if (smsDoc.status === 'rejected') {
    throw new AppError('Transaction is already rejected', 400, 'ALREADY_REJECTED');
  }

  smsDoc.status = 'rejected';
  smsDoc.verificationMethod = 'manual';
  smsDoc.verifiedBy = adminId as any;
  smsDoc.verificationNotes = reason || 'Rejected by admin';
  smsDoc.verifiedAt = new Date();

  await smsDoc.save();

  await createActivityLog({
    userId: adminId,
    action: 'payment_failed',
    message: `Manual rejection: SMS ${String(smsDoc._id)} rejected — ${reason || 'No reason provided'}`,
    entityType: 'SmsTransaction',
    entityId: String(smsDoc._id),
    severity: 'warning',
    metadata: {
      provider: smsDoc.provider,
      amount: smsDoc.parsedAmount,
      reason,
    },
  });

  emitManualVerification({
    type: 'rejected',
    smsTransactionId: String(smsDoc._id),
    rejectedBy: adminId,
    reason,
  });

  return {
    smsTransactionId: String(smsDoc._id),
    status: 'rejected',
    reason,
  };
}
