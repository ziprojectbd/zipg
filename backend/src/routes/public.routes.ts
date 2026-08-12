import { Router } from 'express';
import * as settingsCtrl from '../controllers/admin.controller.js';

const router = Router();

// Public pay settings
router.get('/pay-settings', settingsCtrl.getPaySettingsController);

// Public active payment-method/provider config (drives the invoice page)
router.get('/providers', settingsCtrl.getPublicPaymentMethodsController);

export default router;
