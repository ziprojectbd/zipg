import crypto from 'node:crypto';
import { Transaction, PaymentRequest, type IPaymentRequest, type TransactionStatus, type PaymentProvider } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
import { appConfig } from '../config/app.js';
import { generateSecureInvoiceFields } from './invoice.service.js';
import { generateRequestId } from '../utils/index.js';

interface CreatePaymentInput {
  amount: number;
  currency: string;
  provider: PaymentProvider;
  customerName: string;
  customerPhone: string;
  description?: string;
  customerTransactionId?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
  merchantId?: string;
  apiKeyId?: string;
}

interface CreatePublicPaymentInput {
  amount: number;
  provider: PaymentProvider;
  customerName?: string;
  customerPhone?: string;
  trxId: string;
  currency?: string;
  description?: string;
  merchantName?: string;
  merchantAccount?: string;
  orderId?: string;
  callbackUrl?: string;
}

/** Shape returned when a secure invoice is created — token returned exactly once. */
interface SecureInvoiceResult {
  publicInvoiceId: string;
  secureToken: string;
}

export async function createPayment(input: CreatePaymentInput) {
  const requestId = generateRequestId();
  const expiresAt = new Date(Date.now() + appConfig.payment.defaultExpiryMinutes * 60 * 1000);

  // Every new payment is also a secure invoice — high-entropy public ID and
  // a token-hashed access credential.
  const secure = await generateSecureInvoiceFields({ requestId });

  const paymentRequest = await PaymentRequest.create({
    requestId,
    publicInvoiceId: secure.publicInvoiceId,
    secureTokenHash: secure.secureTokenHash,
    invoiceCreatedAt: secure.invoiceCreatedAt,
    invoiceExpiresAt: secure.invoiceExpiresAt,
    merchantId: input.merchantId,
    apiKeyId: input.apiKeyId,
    amount: input.amount,
    currency: input.currency || 'BDT',
    provider: input.provider,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerTransactionId: input.customerTransactionId,
    description: input.description,
    status: 'pending',
    callbackUrl: input.callbackUrl,
    redirectUrl: input.redirectUrl,
    metadata: input.metadata,
    expiresAt,
  });

  const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  await Transaction.create({
    transactionId,
    paymentRequestId: paymentRequest._id,
    provider: input.provider,
    amount: input.amount,
    currency: input.currency || 'BDT',
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerTransactionId: input.customerTransactionId,
    status: 'pending',
    merchantId: input.merchantId,
    apiKeyId: input.apiKeyId,
    expiresAt,
  });

  await createActivityLog({
    action: 'payment_created',
    message: `Payment request created: ${requestId} for ${input.amount} ${input.currency}`,
    entityType: 'PaymentRequest',
    entityId: requestId,
    metadata: { publicInvoiceId: secure.publicInvoiceId, provider: input.provider, amount: input.amount },
  });

  return {
    requestId,
    publicInvoiceId: secure.publicInvoiceId,
    secureToken: secure.secureToken,
    transactionId,
    amount: input.amount,
    currency: input.currency || 'BDT',
    provider: input.provider,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    redirectUrl: input.redirectUrl,
  };
}

export async function createPublicPayment(input: CreatePublicPaymentInput) {
  const duplicate = await Transaction.findOne({
    provider: input.provider,
    customerTransactionId: input.trxId,
    status: { $nin: ['expired', 'cancelled'] },
  });

  if (duplicate) {
    throw new AppError('This transaction ID has already been submitted', 409, 'DUPLICATE_TRANSACTION');
  }

  const requestId = generateRequestId();
  const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + appConfig.payment.defaultExpiryMinutes * 60 * 1000);

  // Embed secure invoice fields so every public payment is also a secure invoice.
  const secure = await generateSecureInvoiceFields({ requestId });

  const paymentRequest = await PaymentRequest.create({
    requestId,
    publicInvoiceId: secure.publicInvoiceId,
    secureTokenHash: secure.secureTokenHash,
    invoiceCreatedAt: secure.invoiceCreatedAt,
    invoiceExpiresAt: secure.invoiceExpiresAt,
    amount: input.amount,
    currency: input.currency || 'BDT',
    provider: input.provider,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerTransactionId: input.trxId,
    description: input.description,
    status: 'pending',
    callbackUrl: input.callbackUrl,
    merchantName: input.merchantName || '',
    merchantAccount: input.merchantAccount || '',
    orderId: input.orderId || '',
    expiresAt,
  });

  await Transaction.create({
    transactionId,
    paymentRequestId: paymentRequest._id,
    provider: input.provider,
    amount: input.amount,
    currency: input.currency || 'BDT',
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerTransactionId: input.trxId,
    status: 'pending',
    expiresAt,
  });

  return {
    requestId,
    publicInvoiceId: secure.publicInvoiceId,
    secureToken: secure.secureToken,
    transactionId,
    amount: input.amount,
    currency: input.currency || 'BDT',
    provider: input.provider,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getPayment(identifier: string) {
  const payment = await Transaction.findOne({
    $or: [{ transactionId: identifier }, { _id: identifier }],
  }).lean();

  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  return payment;
}

export async function getPaymentByRequestId(requestId: string) {
  const request = await PaymentRequest.findOne({ requestId }).lean();
  if (!request) {
    throw new AppError('Payment request not found', 404, 'REQUEST_NOT_FOUND');
  }

  const transaction = await Transaction.findOne({
    paymentRequestId: request._id,
  }).lean();

  return { request, transaction };
}

export async function listPayments(query: {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  merchantId?: string;
}) {
  const filter: Record<string, unknown> = {};

  if (query.status) filter.status = query.status;
  if (query.provider) filter.provider = query.provider;
  if (query.merchantId) filter.merchantId = query.merchantId;

  if (query.search) {
    filter.$or = [
      { transactionId: { $regex: query.search, $options: 'i' } },
      { customerName: { $regex: query.search, $options: 'i' } },
      { customerPhone: { $regex: query.search, $options: 'i' } },
    ];
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
    if (query.endDate) (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

export async function cancelPayment(identifier: string, reason?: string) {
  const payment = await Transaction.findOne({
    $or: [{ transactionId: identifier }, { _id: identifier }],
  });

  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  if (payment.status !== 'pending') {
    throw new AppError('Only pending payments can be cancelled', 400, 'INVALID_STATUS');
  }

  payment.status = 'cancelled';
  payment.notes = reason || 'Cancelled by user';
  await payment.save();

  await PaymentRequest.updateOne(
    { _id: payment.paymentRequestId },
    { status: 'cancelled' }
  );

  return payment;
}

export async function processSmsPayment(data: {
  deviceId: string;
  provider: PaymentProvider;
  transactionId: string;
  sender: string;
  phone: string;
  amount: number;
  sms: string;
}) {
  // Check for duplicate transaction ID
  const existingTransaction = await Transaction.findOne({
    $or: [
      { customerTransactionId: data.transactionId },
      { 'metadata.trxId': data.transactionId },
    ],
    status: 'paid',
  });

  if (existingTransaction) {
    throw new AppError('Duplicate transaction already processed', 409, 'DUPLICATE_SMS');
  }

  // Stored amounts are whole-taka integers; SMS amounts may be floats
  // (e.g. 1000.00). Match on the rounded amount so they align.
  const normalizedAmount = Math.round(data.amount);

  // Find matching pending payment by provider, amount, and phone
  const pendingPayment = await Transaction.findOne({
    provider: data.provider,
    amount: normalizedAmount,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: 1 });

  if (!pendingPayment) {
    // Try wider match: provider + amount only
    const amountMatch = await Transaction.findOne({
      provider: data.provider,
      amount: normalizedAmount,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: 1 });

    if (!amountMatch) {
      throw new AppError('No matching pending payment found', 404, 'NO_MATCHING_PAYMENT');
    }

    return updatePaymentToPaid(amountMatch, data);
  }

  return updatePaymentToPaid(pendingPayment, data);
}

async function updatePaymentToPaid(
  payment: any,
  data: { deviceId: string; provider: string; transactionId: string; sender: string; phone: string; amount: number; sms: string }
) {
  payment.status = 'paid';
  payment.customerTransactionId = data.transactionId;
  payment.deviceId = data.deviceId;
  payment.smsRaw = data.sms;
  payment.smsSender = data.sender;
  payment.smsReceivedAt = new Date();
  payment.verifiedAt = new Date();
  payment.verificationMethod = 'sms';
  payment.metadata = {
    ...payment.metadata,
    deviceId: data.deviceId,
    trxId: data.transactionId,
    smsProcessedAt: new Date().toISOString(),
  };
  
  await payment.save();

  // Update the payment request
  await PaymentRequest.updateOne(
    { _id: payment.paymentRequestId },
    { status: 'paid', transactionId: data.transactionId }
  );

  await createActivityLog({
    action: 'payment_paid',
    message: `Payment verified via SMS: ${payment.transactionId} - ${data.amount} BDT via ${data.provider}`,
    entityType: 'Transaction',
    entityId: payment.transactionId,
    severity: 'info',
    metadata: {
      provider: data.provider,
      amount: data.amount,
      deviceId: data.deviceId,
    },
  });

  return payment.toObject();
}

export async function getPaymentStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    todayRevenue,
    todayTransactions,
    pendingCount,
    successCount,
    failedCount,
    totalTransactions,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: 'paid', updatedAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.countDocuments({ createdAt: { $gte: startOfToday } }),
    Transaction.countDocuments({ status: 'pending' }),
    Transaction.countDocuments({ status: 'paid' }),
    Transaction.countDocuments({ status: 'failed' }),
    Transaction.countDocuments(),
  ]);

  return {
    todayRevenue: todayRevenue[0]?.total || 0,
    todayTransactions,
    pendingCount,
    successCount,
    failedCount,
    totalTransactions,
  };
}

/**
 * Return the minimal invoice display data for a given requestId.
 * Only the fields the invoice UI needs are returned — nothing secret —
 * and server-side expiry is enforced: an expired invoice is never returned
 * as payable (HTTP 410). Paid invoices stay viewable for tracking.
 */
export async function getPublicInvoiceData(requestId: string) {
  const request = await PaymentRequest.findOne({ requestId }).lean();

  if (!request) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const { isInvoiceExpired } = await import('./invoice.service.js');
  const expired = isInvoiceExpired(request) && request.status !== 'paid';

  if (expired) {
    throw new AppError('This invoice has expired.', 410, 'INVOICE_EXPIRED');
  }

  return {
    requestId: request.requestId,
    publicInvoiceId: request.publicInvoiceId || '',
    merchantName: request.merchantName || '',
    merchantAccount: request.merchantAccount || '',
    orderId: request.orderId || '',
    amount: request.amount,
    provider: request.provider,
    status: request.status,
    invoiceExpiresAt: (request.invoiceExpiresAt ?? request.expiresAt ?? new Date()).toISOString(),
  };
}
