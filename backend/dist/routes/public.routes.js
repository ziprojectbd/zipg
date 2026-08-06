import { Router } from 'express';
import * as settingsCtrl from '../controllers/admin.controller.js';
const router = Router();
// Public pay settings
router.get('/pay-settings', settingsCtrl.getPaySettingsController);
export default router;
