import { Router } from 'express';
import * as adminCtrl from '../controllers/admin.controller.js';
import * as deviceCtrl from '../controllers/device.controller.js';
import * as smsAdminCtrl from '../controllers/smsAdmin.controller.js';
import { authenticate, requireRole, validate } from '../middleware/index.js';
import {
  createUserSchema,
  updateUserSchema,
  createApiKeySchema,
  updatePaySettingsSchema,
  updateSystemSettingsSchema,
  updatePaymentMethodSchema,
  paginationSchema,
  testSmsParserSchema,
  updateSmsParserRulesSchema,
  manualVerifySchema,
  manualRejectSchema,
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

/* ────────── Transactions ────────── */
router.get('/transactions', validate({ query: paginationSchema }), adminCtrl.adminTransactionsController);

/* ────────── Orders / Invoices ────────── */
router.get('/orders', adminCtrl.adminOrdersController);

/* ────────── Customers ────────── */
router.get('/customers', adminCtrl.adminCustomersController);

/* ────────── Refunds ────────── */
router.get('/refunds', adminCtrl.listRefundsController);
router.post('/refunds', adminCtrl.createRefundController);
router.get('/refunds/stats', adminCtrl.refundStatsController);
router.get('/refunds/refundable/:transactionId', adminCtrl.refundableAmountController);
router.get('/refunds/:refundId', adminCtrl.getRefundController);
router.post('/refunds/:refundId/process', adminCtrl.processRefundController);
router.post('/refunds/:refundId/cancel', adminCtrl.cancelRefundController);

/* ────────── Reconciliation ────────── */
router.get('/reconciliation/summary', adminCtrl.reconciliationSummaryController);
router.get('/reconciliation/mismatches', adminCtrl.reconciliationMismatchesController);
router.get('/reconciliation/daily', adminCtrl.reconciliationDailyController);

/* ────────── Security Center ────────── */
router.get('/security/overview', adminCtrl.securityOverviewController);
router.get('/security/sessions', adminCtrl.activeSessionsController);
router.delete('/security/sessions/:sessionId', adminCtrl.revokeAdminSessionController);
router.post('/security/sessions/revoke-all', adminCtrl.revokeAllSessionsController);
router.get('/security/login-history', adminCtrl.loginHistoryController);
router.get('/security/failed-logins', adminCtrl.failedLoginAttemptsController);

/* ────────── System Health ────────── */
router.get('/system-health', adminCtrl.systemHealthController);
router.get('/system-health/uptime', adminCtrl.systemUptimeController);
router.get('/system-health/resources', adminCtrl.systemResourcesController);

/* ────────── Notifications ────────── */
router.get('/notifications/preferences', adminCtrl.notificationPreferencesController);
router.put('/notifications/preferences', adminCtrl.updateNotificationPreferencesController);
router.get('/notifications/log', adminCtrl.notificationLogController);
router.post('/notifications/test', adminCtrl.sendTestNotificationController);

/* ────────── SMS Transactions ────────── */
router.get('/sms-transactions', smsAdminCtrl.listSmsTransactionsController);
router.get('/sms-transactions/stats', smsAdminCtrl.smsTransactionStatsController);
router.get('/sms-transactions/:id', smsAdminCtrl.getSmsTransactionController);

/* ────────── Manual Verification ────────── */
router.get('/manual-verification', smsAdminCtrl.getPendingVerificationsController);
router.post('/manual-verification/:id/verify', validate({ body: manualVerifySchema }), smsAdminCtrl.verifySmsController);
router.post('/manual-verification/:id/reject', validate({ body: manualRejectSchema }), smsAdminCtrl.rejectSmsController);

/* ────────── SMS Parser ────────── */
router.post('/sms-parser/test', validate({ body: testSmsParserSchema }), smsAdminCtrl.testSmsParserController);
router.get('/sms-parser/rules', smsAdminCtrl.getParserRulesController);
router.put('/sms-parser/rules', validate({ body: updateSmsParserRulesSchema }), smsAdminCtrl.updateParserRulesController);

export default router;
