import { Router } from 'express';
import * as adminCtrl from '../controllers/admin.controller.js';
import * as deviceCtrl from '../controllers/device.controller.js';
import { authenticate, requireRole, validate } from '../middleware/index.js';
import {
  createUserSchema,
  updateUserSchema,
  createApiKeySchema,
  updatePaySettingsSchema,
  updateSystemSettingsSchema,
  updatePaymentMethodSchema,
} from '../validators/index.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

/* ────────── Dashboard / Analytics ────────── */
router.get('/dashboard/overview', adminCtrl.dashboardOverviewController);
router.get('/analytics/revenue', adminCtrl.revenueChartController);
router.get('/analytics/providers', adminCtrl.providerAnalyticsController);
router.get('/analytics/success-rate', adminCtrl.successRateController);
router.get('/analytics/transactions', adminCtrl.transactionStatsController);

/* ────────── Users ────────── */
router.get('/users', requireRole('super_admin'), adminCtrl.listUsersController);
router.post('/users', requireRole('super_admin'), validate({ body: createUserSchema }), adminCtrl.createUserController);
router.get('/users/:id', requireRole('super_admin'), adminCtrl.getUserController);
router.put('/users/:id', requireRole('super_admin'), validate({ body: updateUserSchema }), adminCtrl.updateUserController);
router.delete('/users/:id', requireRole('super_admin'), adminCtrl.deleteUserController);

/* ────────── Devices ────────── */
router.get('/devices', deviceCtrl.listDevicesController);
router.get('/devices/stats', deviceCtrl.deviceStatsController);
router.get('/devices/:deviceId', deviceCtrl.getDeviceController);
router.put('/devices/:deviceId', deviceCtrl.updateDeviceController);
router.delete('/devices/:deviceId', deviceCtrl.deleteDeviceController);

/* ────────── API Keys ────────── */
router.get('/api-keys', adminCtrl.listApiKeysController);
router.post('/api-keys', validate({ body: createApiKeySchema }), adminCtrl.createApiKeyController);
router.get('/api-keys/:id', adminCtrl.getApiKeyController);
router.post('/api-keys/:id/regenerate', adminCtrl.regenerateApiKeyController);
router.post('/api-keys/:id/revoke', adminCtrl.revokeApiKeyController);

/* ────────── Settings ────────── */
router.get('/settings/pay', adminCtrl.getPaySettingsController);
router.put('/settings/pay', validate({ body: updatePaySettingsSchema }), adminCtrl.updatePaySettingsController);
router.get('/settings/system', adminCtrl.getSystemSettingsController);
router.put('/settings/system', validate({ body: updateSystemSettingsSchema }), adminCtrl.updateSystemSettingsController);

/* ────────── Payment Methods ────────── */
router.get('/payment-methods', adminCtrl.listPaymentMethodsController);
router.put('/payment-methods/:code', validate({ body: updatePaymentMethodSchema }), adminCtrl.updatePaymentMethodController);

/* ────────── Activity Logs ────────── */
router.get('/activity-logs', adminCtrl.activityLogsController);

export default router;
