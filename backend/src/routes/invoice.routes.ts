import { Router } from 'express';
import { invoiceAccessController, invoiceMintController } from '../controllers/invoice.controller.js';
import {
  invoiceAccessLimiter,
  invoiceCreateLimiter,
  validate,
} from '../middleware/index.js';
import {
  invoiceAccessParamsSchema,
  invoiceAccessQuerySchema,
  invoiceMintSchema,
} from '../validators/index.js';

const router = Router();

/**
 * Secure invoice access — the ONLY way a customer loads a pending invoice.
 * High-entropy ID + 256-bit token, both validated; rate-limited against
 * brute-force/enumeration.
 *   GET /api/invoices/:invoiceId?token=<raw>
 */
router.get(
  '/:invoiceId',
  invoiceAccessLimiter,
  validate({ params: invoiceAccessParamsSchema, query: invoiceAccessQuerySchema }),
  invoiceAccessController
);

/**
 * Legacy Main Site flow support — the invoice page mints a one-time,
 * server-authoritative invoice when the main site sent no requestId.
 *   POST /api/invoices/mint
 */
router.post(
  '/mint',
  invoiceCreateLimiter,
  validate({ body: invoiceMintSchema }),
  invoiceMintController
);

export default router;