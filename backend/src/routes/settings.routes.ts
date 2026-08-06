import { Router } from 'express';
import * as settingsCtrl from '../controllers/settings.controller.js';
import * as smsCtrl from '../controllers/sms.controller.js';
import { authenticate, requireRole, validate } from '../middleware/index.js';
import {
  updateGeneralSettingsSchema,
  updateGatewaySettingsSchema,
  updateSecuritySettingsSchema,
  updateSmsSettingsSchema,
  updateDeviceSettingsSchema,
  updateMerchantSettingsSchema,
  updateNotificationSettingsSchema,
  updateEmailSettingsSchema,
  updateApiSettingsSchema,
  updateAppearanceSettingsSchema,
  updateAnalyticsSettingsSchema,
  testEmailSchema,
} from '../validators/index.js';

const router = Router();

router.use(authenticate, requireRole('super_admin'));

/* ────────── All Settings ────────── */
router.get('/', settingsCtrl.getAllSettingsController);

/* ────────── System Info ────────── */
router.get('/system-info', settingsCtrl.getSystemInfoController);

/* ────────── SMS Endpoints ────────── */
router.post('/sms/test', smsCtrl.testSmsController);
router.get('/sms/stats', smsCtrl.smsStatsController);
router.get('/sms/logs', smsCtrl.smsLogsController);
router.post('/sms/cleanup', smsCtrl.smsCleanupController);

/* ────────── Email Test ────────── */
router.post('/email/test', validate({ body: testEmailSchema }), settingsCtrl.testEmailController);

/* ────────── Individual Groups ────────── */
router.get('/:group', settingsCtrl.getSettingsController);
router.put('/:group', settingsCtrl.updateSettingsController);

export default router;
