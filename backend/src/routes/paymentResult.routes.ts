import { Router } from 'express';
import {
  resolvePaymentResultController,
  createPaymentResultController,
} from '../controllers/paymentResult.controller.js';

/**
 * Payment result lifecycle:
 *   POST /api/v1/payment-results — invoice submit creates a one-time result.
 *   GET  /api/v1/payment-results/:requestId?token=<rawToken>
 *        — main site resolves it server-to-server.
 */
const router = Router();

router.post('/', createPaymentResultController);
router.get('/:requestId', resolvePaymentResultController);

export default router;
