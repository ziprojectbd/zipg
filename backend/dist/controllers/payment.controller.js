import * as paymentService from '../services/payment.service.js';
import * as deviceService from '../services/device.service.js';
import * as webhookService from '../services/webhook.service.js';
import { createActivityLog } from '../services/activityLog.service.js';
/* ────────── Merchant API ────────── */
export async function createPaymentController(req, res, next) {
    try {
        const merchantId = req.apiKey?.merchantId;
        const apiKeyId = req.apiKey?.id;
        const payment = await paymentService.createPayment({
            ...req.body,
            merchantId,
            apiKeyId,
        });
        res.status(201).json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function checkPaymentController(req, res, next) {
    try {
        const { paymentId } = req.params;
        const payment = await paymentService.getPayment(String(paymentId));
        res.json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function cancelPaymentController(req, res, next) {
    try {
        const { paymentId } = req.params;
        const reason = req.body.reason;
        const payment = await paymentService.cancelPayment(String(paymentId), reason);
        // Convert Mongoose document to plain object for webhook
        const paymentObj = payment.toObject ? payment.toObject() : payment;
        await webhookService.triggerWebhook('payment.cancelled', paymentObj);
        res.json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function listMerchantPaymentsController(req, res, next) {
    try {
        const merchantId = req.apiKey?.merchantId;
        const query = { ...req.query, merchantId };
        const result = await paymentService.listPayments(query);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
}
/* ────────── Public API ────────── */
export async function publicPaymentController(req, res, next) {
    try {
        const payment = await paymentService.createPublicPayment(req.body);
        res.status(201).json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function publicPaymentStatusController(req, res, next) {
    try {
        const { requestId } = req.params;
        const result = await paymentService.getPaymentByRequestId(String(requestId));
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
}
/* ────────── Admin API ────────── */
export async function listPaymentsController(req, res, next) {
    try {
        const result = await paymentService.listPayments(req.query);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function getPaymentController(req, res, next) {
    try {
        const { paymentId } = req.params;
        const payment = await paymentService.getPayment(String(paymentId));
        res.json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function updatePaymentController(req, res, next) {
    try {
        const { paymentId } = req.params;
        const payment = await paymentService.getPayment(String(paymentId));
        const { Transaction } = await import('../models/index.js');
        const updated = await Transaction.findByIdAndUpdate(payment._id, { $set: req.body }, { new: true });
        if (!updated) {
            res.status(404).json({ success: false, error: 'Payment not found', code: 'NOT_FOUND' });
            return;
        }
        res.json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
}
/* ────────── SMS from Android Device ────────── */
export async function smsController(req, res, next) {
    try {
        const { deviceId, provider, transactionId, sender, phone, amount, sms } = req.body;
        const device = await deviceService.getDevice(deviceId);
        if (!device.isEnabled || !device.isApproved) {
            res.status(403).json({
                success: false,
                error: 'Device is not authorized',
                code: 'DEVICE_NOT_AUTHORIZED',
            });
            return;
        }
        const payment = await paymentService.processSmsPayment({
            deviceId,
            provider,
            transactionId,
            sender,
            phone,
            amount,
            sms,
        });
        await deviceService.updateDevice(deviceId, {
            batteryLevel: req.body.batteryLevel,
        });
        await webhookService.triggerWebhook('payment.paid', payment);
        await createActivityLog({
            action: 'sms_received',
            message: `SMS processed: ${transactionId} from ${sender} - ${amount} BDT`,
            entityType: 'Transaction',
            entityId: payment.transactionId,
            metadata: { deviceId, provider, amount, sender },
        });
        res.json({
            success: true,
            data: {
                matched: true,
                transactionId: payment.transactionId,
                status: payment.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/* ────────── Stats ────────── */
export async function paymentStatsController(_req, res, next) {
    try {
        const stats = await paymentService.getPaymentStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        next(error);
    }
}
