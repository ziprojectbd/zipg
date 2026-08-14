import { Request, Response, NextFunction } from 'express';
import * as invoiceService from '../services/invoice.service.js';
import { generateRequestId } from '../utils/index.js';
import { PaymentRequest, PaymentMethod } from '../models/index.js';
import { createActivityLog } from '../services/activityLog.service.js';
import { appConfig } from '../config/app.js';

/* ────────── Secure invoice access (token-gated) ──────────
 * GET /api/invoices/:invoiceId?token=<rawToken>
 * The ONLY public data endpoint that returns a live, pending invoice.
 * Cache-Control: no-store is mandatory — invoices are per-customer secrets.
 */
export async function invoiceAccessController(req: Request, res: Response, next: NextFunction) {
  try {
    const rawInvoiceId = req.params.invoiceId;
    const invoiceId = Array.isArray(rawInvoiceId) ? rawInvoiceId[0] : rawInvoiceId;
    const token = String(req.query.token ?? '');

    const clientIp: string | undefined = Array.isArray(req.ip) ? req.ip[0] : req.ip;
    const invoice = await invoiceService.verifyInvoiceAccess(invoiceId, token, {
      ip: clientIp,
      userAgent: req.get('user-agent'),
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

/* ────────── One-time invoice minting (secure session flow) ──────────
 * POST /api/invoices/mint
 * Body: { provider, amount, currency?, merchantName?, merchantAccount?,
 *         orderId? }
 *
 * The gateway chooser (/payment/choose?session=<token>) resolves the
 * authoritative amount from the backend PaymentSession, then mints a real,
 * one-time, expiring PaymentRequest here and switches to the secure URL
 * ?invoiceId=&token=. The amount is always server-derived — it is never
 * read from the browser URL.
 *
 * Returns the raw secureToken exactly once.
 */
export async function invoiceMintController(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      provider,
      amount,
      currency,
      merchantName,
      merchantAccount,
      orderId,
    } = req.body;

    if (!amount || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > appConfig.payment.maxAmount) {
      res.status(400).json({
        success: false,
        error: 'Invalid amount',
        code: 'INVALID_AMOUNT',
      });
      return;
    }

    // Normalize to whole taka (round-to-nearest). The invoice/payment session
    // amount must be the same integer the main site charged — never a fraction.
    const amountInt = Math.round(amount);

    // Provider list is DB-driven — only active, configured providers mint invoices.
    const activeMethod = provider ? await PaymentMethod.findOne({ code: provider, isActive: true }).lean() : null;
    if (!provider || !activeMethod) {
      res.status(400).json({
        success: false,
        error: 'Unsupported payment provider',
        code: 'INVALID_PROVIDER',
      });
      return;
    }

    const requestId = generateRequestId();
    const invoice = await invoiceService.generateSecureInvoiceFields({ requestId });

    const invoiceDoc = await PaymentRequest.create({
      requestId,
      publicInvoiceId: invoice.publicInvoiceId,
      secureTokenHash: invoice.secureTokenHash,
      invoiceCreatedAt: invoice.invoiceCreatedAt,
      invoiceExpiresAt: invoice.invoiceExpiresAt,
      amount: amountInt,
      currency: currency || 'BDT',
      provider,
      merchantName: typeof merchantName === 'string' ? merchantName.slice(0, 200) : '',
      merchantAccount: typeof merchantAccount === 'string' ? merchantAccount.slice(0, 80) : '',
      orderId: typeof orderId === 'string' ? orderId.slice(0, 200) : '',
      status: 'pending',
      // Keep the legacy required expiry in sync so existing machinery works.
      expiresAt: invoice.invoiceExpiresAt,
      metadata: { mintedLegacy: true, source: req.get('referer') || '' },
    });

    await createActivityLog({
      action: 'invoice_created',
      severity: 'info',
      message: `Secure invoice created: ${invoice.publicInvoiceId}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      entityType: 'PaymentRequest',
      entityId: invoice.publicInvoiceId,
      metadata: { provider, amount: amountInt },
    });

    res.status(201).json({
      success: true,
      data: {
        publicInvoiceId: invoice.publicInvoiceId,
        secureToken: invoice.secureToken,
        requestId,
        expiresAt: invoice.invoiceExpiresAt.toISOString(),
      },
      // Raw token returned once — the caller must not re-send it anywhere
      // other than the customer's secure invoice URL.
    });
  } catch (error) {
    next(error);
  }
}