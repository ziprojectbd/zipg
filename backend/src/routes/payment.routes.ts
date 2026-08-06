import { Router } from 'express';
import * as paymentCtrl from '../controllers/payment.controller.js';
import { authenticate, authenticateApiKey, validate, smsLimiter } from '../middleware/index.js';
import { smsPayloadSchema, requestIdParamSchema } from '../validators/index.js';

const router = Router();

// Android SMS receiver (public, rate limited)
router.post('/sms', smsLimiter, validate({ body: smsPayloadSchema }), paymentCtrl.smsController);

// Merchant API (API key authenticated)
router.post('/merchant/create', authenticateApiKey, paymentCtrl.createPaymentController);
router.get('/merchant/payments', authenticateApiKey, paymentCtrl.listMerchantPaymentsController);
router.get('/merchant/payments/:paymentId', authenticateApiKey, paymentCtrl.checkPaymentController);
router.post('/merchant/payments/:paymentId/cancel', authenticateApiKey, paymentCtrl.cancelPaymentController);

// Public API
router.post('/public/create', paymentCtrl.publicPaymentController);
router.get('/public/status/:requestId', paymentCtrl.publicPaymentStatusController);
router.get('/public/request/:requestId', validate({ params: requestIdParamSchema }), paymentCtrl.publicInvoiceController);

// Admin API (JWT authenticated)
router.get('/admin/payments', authenticate, paymentCtrl.listPaymentsController);
router.get('/admin/payments/:paymentId', authenticate, paymentCtrl.getPaymentController);
router.put('/admin/payments/:paymentId', authenticate, paymentCtrl.updatePaymentController);
router.get('/admin/stats', authenticate, paymentCtrl.paymentStatsController);

export default router;
