import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PaymentSession } from '../models/PaymentSession.js';
import { createActivityLog } from '../services/activityLog.service.js';
import { appConfig } from '../config/app.js';

const SESSION_TTL_MINUTES = Number(process.env.PAYMENT_SESSION_TTL_MINUTES) || 30;

function generateSessionToken(): string {
  // 32 random bytes → 64 hex chars. High entropy, unguessable — the token is
  // the only thing the main site needs to hold; no amount/orderId in URLs.
  return crypto.randomBytes(32).toString('hex');
}

/* ────────── Create a payment session (main site → gateway) ──────────
 * POST /api/v1/payment-sessions
 * Body: { amount, orderId?, email? }
 *
 * The main site creates a short-lived session instead of putting the amount
 * (and order number) into a URL. The customer is then redirected to
 * /payment/choose?session=<token> where the amount is resolved server-side —
 * the browser never carries the price, so it cannot be tampered with.
 */
export async function createPaymentSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    const rawAmount = req.body?.amount;
    const amount = Math.round(Number(rawAmount));

    if (!Number.isFinite(amount) || amount <= 0 || amount > appConfig.payment.maxAmount) {
      res.status(400).json({ success: false, error: 'Invalid amount', code: 'INVALID_AMOUNT' });
      return;
    }

    const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim().slice(0, 200) : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().slice(0, 320) : '';
    const currency = typeof req.body?.currency === 'string' && req.body.currency.length === 3
      ? req.body.currency.toUpperCase()
      : 'BDT';

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);

    await PaymentSession.create({
      token,
      amount,
      currency,
      orderId,
      email,
      status: 'pending',
      expiresAt,
    });

    await createActivityLog({
      action: 'payment_session_created',
      severity: 'info',
      message: `Payment session created: amount ${amount} ${currency}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      entityType: 'PaymentSession',
      metadata: { amount, currency, orderId },
    });

    res.status(201).json({
      success: true,
      data: {
        sessionToken: token,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/* ────────── Resolve a payment session (gateway chooser page) ──────────
 * GET /api/v1/payment-sessions/:token
 * Returns the server-authoritative amount + orderId for the session. The
 * chooser page uses this to mint the invoice — the browser never sees the
 * amount in a URL, and an expired/consumed session is rejected.
 */
export async function resolvePaymentSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.params.token || '');

    const session = await PaymentSession.findOne({ token }).lean();
    if (!session) {
      res.status(404).json({ success: false, error: 'Payment session not found', code: 'SESSION_NOT_FOUND' });
      return;
    }

    if (session.status !== 'pending') {
      res.status(410).json({ success: false, error: 'Payment session is no longer active', code: 'SESSION_CONSUMED' });
      return;
    }

    if (new Date(session.expiresAt) < new Date()) {
      res.status(410).json({ success: false, error: 'Payment session has expired', code: 'SESSION_EXPIRED' });
      return;
    }

    res.json({
      success: true,
      data: {
        amount: session.amount,
        currency: session.currency,
        orderId: session.orderId || '',
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
