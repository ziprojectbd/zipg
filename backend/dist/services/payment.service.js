import crypto from 'node:crypto';
import { Transaction, PaymentRequest } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
import { appConfig } from '../config/app.js';
export async function createPayment(input) {
    const requestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + appConfig.payment.defaultExpiryMinutes * 60 * 1000);
    const paymentRequest = await PaymentRequest.create({
        requestId,
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
        metadata: { provider: input.provider, amount: input.amount },
    });
    return {
        requestId,
        transactionId,
        amount: input.amount,
        currency: input.currency || 'BDT',
        provider: input.provider,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
        redirectUrl: input.redirectUrl,
    };
}
export async function createPublicPayment(input) {
    const duplicate = await Transaction.findOne({
        provider: input.provider,
        customerTransactionId: input.trxId,
        status: { $nin: ['expired', 'cancelled'] },
    });
    if (duplicate) {
        throw new AppError('This transaction ID has already been submitted', 409, 'DUPLICATE_TRANSACTION');
    }
    const requestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + appConfig.payment.defaultExpiryMinutes * 60 * 1000);
    await PaymentRequest.create({
        requestId,
        amount: input.amount,
        currency: input.currency || 'BDT',
        provider: input.provider,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerTransactionId: input.trxId,
        description: input.description,
        status: 'pending',
        expiresAt,
    });
    await Transaction.create({
        transactionId,
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
        transactionId,
        amount: input.amount,
        currency: input.currency || 'BDT',
        provider: input.provider,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
    };
}
export async function getPayment(identifier) {
    const payment = await Transaction.findOne({
        $or: [{ transactionId: identifier }, { _id: identifier }],
    }).lean();
    if (!payment) {
        throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }
    return payment;
}
export async function getPaymentByRequestId(requestId) {
    const request = await PaymentRequest.findOne({ requestId }).lean();
    if (!request) {
        throw new AppError('Payment request not found', 404, 'REQUEST_NOT_FOUND');
    }
    const transaction = await Transaction.findOne({
        paymentRequestId: request._id,
    }).lean();
    return { request, transaction };
}
export async function listPayments(query) {
    const filter = {};
    if (query.status)
        filter.status = query.status;
    if (query.provider)
        filter.provider = query.provider;
    if (query.merchantId)
        filter.merchantId = query.merchantId;
    if (query.search) {
        filter.$or = [
            { transactionId: { $regex: query.search, $options: 'i' } },
            { customerName: { $regex: query.search, $options: 'i' } },
            { customerPhone: { $regex: query.search, $options: 'i' } },
        ];
    }
    if (query.startDate || query.endDate) {
        filter.createdAt = {};
        if (query.startDate)
            filter.createdAt.$gte = new Date(query.startDate);
        if (query.endDate)
            filter.createdAt.$lte = new Date(query.endDate);
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
export async function cancelPayment(identifier, reason) {
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
    await PaymentRequest.updateOne({ _id: payment.paymentRequestId }, { status: 'cancelled' });
    return payment;
}
export async function processSmsPayment(data) {
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
    // Find matching pending payment by provider, amount, and phone
    const pendingPayment = await Transaction.findOne({
        provider: data.provider,
        amount: data.amount,
        status: 'pending',
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: 1 });
    if (!pendingPayment) {
        // Try wider match: provider + amount only
        const amountMatch = await Transaction.findOne({
            provider: data.provider,
            amount: data.amount,
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
async function updatePaymentToPaid(payment, data) {
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
    await PaymentRequest.updateOne({ _id: payment.paymentRequestId }, { status: 'paid', transactionId: data.transactionId });
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
    const [todayRevenue, todayTransactions, pendingCount, successCount, failedCount, totalTransactions,] = await Promise.all([
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
