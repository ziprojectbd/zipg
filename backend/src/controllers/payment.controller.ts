import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service.js';
import * as deviceService from '../services/device.service.js';
import * as webhookService from '../services/webhook.service.js';
import * as smsParserService from '../services/smsParser.service.js';
import { createActivityLog } from '../services/activityLog.service.js';
import type { TransactionStatus } from '../models/Transaction.js';

/* ────────── Merchant API ────────── */
export async function createPaymentController(req: Request, res: Response, next: NextFunction) {
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
  } catch (error) {
    next(error);
  }
}

export async function checkPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentId } = req.params;
    const payment = await paymentService.getPayment(String(paymentId));

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentId } = req.params;
    const reason = req.body.reason;
    const payment = await paymentService.cancelPayment(String(paymentId), reason);

    // Convert Mongoose document to plain object for webhook
    const paymentObj = (payment as any).toObject ? (payment as any).toObject() : payment;
    await webhookService.triggerWebhook('payment.cancelled', paymentObj as Record<string, unknown>);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function listMerchantPaymentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.apiKey?.merchantId;
    const query = { ...req.query, merchantId } as any;
    const result = await paymentService.listPayments(query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/* ────────── Public API ────────── */
export async function publicPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await paymentService.createPublicPayment(req.body);

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function publicPaymentStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const { requestId } = req.params;
    const result = await paymentService.getPaymentByRequestId(String(requestId));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function publicInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    const { requestId } = req.params;
    const invoice = await paymentService.getPublicInvoiceData(String(requestId));

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

/* ────────── Admin API ────────── */
export async function listPaymentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.listPayments(req.query as any);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentId } = req.params;
    const payment = await paymentService.getPayment(String(paymentId));

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentId } = req.params;
    const { status, notes } = req.body as { status?: string; notes?: string };

    const { Transaction } = await import('../models/index.js');
    const { assertValidTransition } = await import('../services/invoice.service.js');
    const { AppError } = await import('../middleware/errorHandler.js');
    const { createActivityLog } = await import('../services/activityLog.service.js');

    const current = await Transaction.findOne({
      $or: [{ transactionId: String(paymentId) }, { _id: String(paymentId) }],
    });

    if (!current) {
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }

    // If a status change was requested, validate the state machine transition
    if (status && status !== current.status) {
      assertValidTransition(current.status as TransactionStatus, status as TransactionStatus);
      current.status = status as TransactionStatus;
    }

    if (notes !== undefined) current.notes = notes;
    await current.save();

    await createActivityLog({
      action: status === 'paid' ? 'payment_verified' : status === 'failed' ? 'payment_failed' : 'payment_cancelled',
      message: `Payment ${current.transactionId} updated: status=${current.status}`,
      entityType: 'Transaction',
      entityId: current.transactionId,
      severity: 'info',
      metadata: { previousStatus: current.status, requestedStatus: status, notes },
    });

    res.json({ success: true, data: current });
  } catch (error) {
    next(error);
  }
}

/* ────────── SMS from Android Device ────────── */
/**
 * Receives an SMS from an Android device. All parsing happens server-side.
 *
 * Preferred payload (new Android app):
 *   { deviceId, rawSms, sender, provider?, receivedAt?, batteryLevel? }
 *
 * Legacy payload (pre-parsed fields) is still accepted for a graceful
 * migration window: { deviceId, provider, transactionId, sender, phone,
 * amount, sms } — a warning is logged and it is forwarded for pricing
 * verification as-is.
 */
export async function smsController(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      deviceId,
      rawSms,
      sms,
      provider,
      transactionId,
      sender,
      phone,
      amount,
    } = req.body;

    const device = await deviceService.getDevice(deviceId);

    if (!device.isEnabled || !device.isApproved) {
      res.status(403).json({
        success: false,
        error: 'Device is not authorized',
        code: 'DEVICE_NOT_AUTHORIZED',
      });
      return;
    }

    // Legacy pre-parsed payload? Log a warning and keep working.
    const isLegacy = !rawSms && !!sms;
    if (isLegacy) {
      await createActivityLog({
        action: 'sms_received',
        message: `Legacy pre-parsed SMS payload received from device ${deviceId} — consider updating the Android app`,
        entityType: 'Device',
        entityId: deviceId,
        severity: 'warning',
        metadata: { deviceId, provider },
      });
    }

    // New raw SMS pipeline — delegate parsing to the server-side parser.
    const result = await smsParserService.processIncomingSms({
      deviceId,
      rawSms: rawSms || sms,
      sender,
      provider: provider,
      receivedAt: req.body.receivedAt,
    });

    await deviceService.updateDevice(deviceId, {
      batteryLevel: req.body.batteryLevel,
    });

    // Fire the webhook only when a payment was actually matched & completed.
    if (result.matched && result.transactionId) {
      const payment = await paymentService.getPayment(result.transactionId);
      await webhookService.triggerWebhook('payment.paid', payment);
    }

    res.json({
      success: true,
      data: {
        matched: result.matched,
        smsTransactionId: result.smsTransactionId,
        transactionId: result.transactionId,
        status: result.status,
        needManualVerification: !result.matched,
      },
    });
  } catch (error) {
    next(error);
  }
}

/* ────────── Stats ────────── */
export async function paymentStatsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await paymentService.getPaymentStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
