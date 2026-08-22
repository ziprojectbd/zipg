import { Request, Response, NextFunction } from 'express';
import { createPaymentResult, verifyPaymentResult } from '../services/paymentResult.service.js';
import { createActivityLog } from '../services/activityLog.service.js';

/* ────────── Create a one-time payment result ──────────
 * POST /api/v1/payment-results
 * Body: { provider, amount, currency?, orderId?, trxId?, payerNumber?,
 *         merchantName?, paymentRequestId? }
 *
 * Called by the gateway's invoice submit (client-side). Returns the raw
 * secureToken exactly once — the caller uses it in the redirect URL only.
 */
export async function createPaymentResultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      provider,
      amount,
      currency,
      orderId,
      trxId,
      payerNumber,
      merchantName,
      paymentRequestId,
    } = req.body;

    if (
      !provider ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      res.status(400).json({
        success: false,
        error: 'Invalid provider or amount',
        code: 'INVALID_RESULT',
      });
      return;
    }

    const created = await createPaymentResult({
      paymentRequestId: typeof paymentRequestId === 'string' ? paymentRequestId.slice(0, 200) : '',
      orderId: typeof orderId === 'string' ? orderId.slice(0, 200) : '',
      provider,
      amount: Math.round(amount),
      currency: typeof currency === 'string' ? currency.slice(0, 10) : 'BDT',
      payerDetails: {
        payerNumber: typeof payerNumber === 'string' ? payerNumber.slice(0, 30) : '',
        trxId: typeof trxId === 'string' ? trxId.slice(0, 100) : '',
        merchantName: typeof merchantName === 'string' ? merchantName.slice(0, 200) : '',
      },
    });

    await createActivityLog({
      action: 'payment_result_created',
      severity: 'info',
      message: `Payment result created: ${created.requestId}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      entityType: 'PaymentResult',
      entityId: created.requestId,
      metadata: { provider, amount: created.amount, orderId },
    });

    res.status(201).json({
      success: true,
      data: {
        requestId: created.requestId,
        secureToken: created.rawToken,
        expiresAt: created.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/* ────────── Resolve a one-time payment result (server-to-server) ──────────
 * GET /api/v1/payment-results/:requestId?token=<rawToken>
 *
 * The main site's backend calls this after the customer's browser lands on
 * /payment/process. It verifies the token and consumes the record exactly
 * once. The amount/provider/orderId here are the gateway-authoritative values.
 */
export async function resolvePaymentResultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawRequestId = req.params.requestId;
    const requestId = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId;
    const token = String(req.query.token ?? '');

    if (!requestId || !token) {
      res.status(400).json({
        success: false,
        error: 'Missing requestId or token',
        code: 'INVALID_RESULT',
      });
      return;
    }

    const clientIp: string | undefined = Array.isArray(req.ip) ? req.ip[0] : req.ip;
    const result = await verifyPaymentResult(requestId, token, clientIp);

    if (!result) {
      await createActivityLog({
        action: 'payment_result_resolve_failed',
        severity: 'warning',
        message: `Payment result resolve failed: ${requestId}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        entityType: 'PaymentResult',
        entityId: requestId,
      });
      res.status(404).json({
        success: false,
        error: 'Payment result not found or already consumed',
        code: 'RESULT_NOT_FOUND',
      });
      return;
    }

    await createActivityLog({
      action: 'payment_result_resolved',
      severity: 'info',
      message: `Payment result resolved: ${result.requestId}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      entityType: 'PaymentResult',
      entityId: result.requestId,
      metadata: {
        provider: result.provider,
        amount: result.amount,
        currency: result.currency,
        orderId: result.orderId,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
