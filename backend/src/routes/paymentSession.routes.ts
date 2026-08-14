import { Router } from 'express';
import {
  createPaymentSessionController,
  resolvePaymentSessionController,
} from '../controllers/paymentSession.controller.js';
import { apiLimiter } from '../middleware/index.js';

const router = Router();

/**
 * Main site flow — create a short-lived payment session.
 *   POST /api/v1/payment-sessions
 * Body: { amount, orderId?, email?, currency? }
 */
router.post('/', apiLimiter, createPaymentSessionController);

/**
 * Gateway chooser page — resolve a session's server-authoritative data.
 *   GET /api/v1/payment-sessions/:token
 */
router.get('/:token', apiLimiter, resolvePaymentSessionController);

export default router;
