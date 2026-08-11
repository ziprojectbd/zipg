import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';
import * as apiKeyService from '../services/apiKey.service.js';
import * as analyticsService from '../services/analytics.service.js';
import * as settingsService from '../services/settings.service.js';
import * as activityLogService from '../services/activityLog.service.js';
import * as refundService from '../services/refund.service.js';
import * as reconciliationService from '../services/reconciliation.service.js';
import * as securityService from '../services/security.service.js';
import * as systemHealthService from '../services/systemHealth.service.js';
import * as notificationService from '../services/notification.service.js';
import * as paymentService from '../services/payment.service.js';
import { Transaction, PaymentRequest, PaymentMethod } from '../models/index.js';

/* ────────── Users ────────── */
export async function createUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) { next(error); }
}

export async function listUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.listUsers(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(String(req.params.id));
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(String(req.params.id), req.body);
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.deleteUser(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── API Keys ────────── */
export async function createApiKeyController(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = await apiKeyService.createApiKey(req.body);
    res.status(201).json({ success: true, data: apiKey });
  } catch (error) { next(error); }
}

export async function listApiKeysController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await apiKeyService.listApiKeys(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getApiKeyController(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = await apiKeyService.getApiKey(String(req.params.id));
    res.json({ success: true, data: apiKey });
  } catch (error) { next(error); }
}

export async function regenerateApiKeyController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await apiKeyService.regenerateApiKey(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function revokeApiKeyController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await apiKeyService.revokeApiKey(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── Analytics ────────── */
export async function dashboardOverviewController(_req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await analyticsService.getDashboardOverview();
    res.json({ success: true, data: overview });
  } catch (error) { next(error); }
}

export async function revenueChartController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getRevenueChart(req.query as any);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function providerAnalyticsController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getProviderAnalytics(req.query as any);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function successRateController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getSuccessRate(req.query as any);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function transactionStatsController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getTransactionStats(req.query as any);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

/* ────────── Settings ────────── */
export async function getPaySettingsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getPaySettings();
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

export async function updatePaySettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const settings = await settingsService.updatePaySettings(req.body, userId);
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

export async function getSystemSettingsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getSystemSettings();
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

export async function updateSystemSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const settings = await settingsService.updateSystemSettings(req.body, userId);
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

/* ────────── Payment Methods ────────── */
export async function listPaymentMethodsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const methods = await PaymentMethod.find().sort({ sortOrder: 1 }).lean();
    res.json({ success: true, data: { methods } });
  } catch (error) { next(error); }
}

export async function updatePaymentMethodController(req: Request, res: Response, next: NextFunction) {
  try {
    const method = await PaymentMethod.findOneAndUpdate(
      { code: String(req.params.code) },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: method });
  } catch (error) { next(error); }
}

/* ────────── Activity Logs ────────── */
export async function activityLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await activityLogService.getActivityLogs(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── Transactions (Admin) ────────── */
export async function adminTransactionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.listPayments(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── Orders / Invoices (Admin) ────────── */
export async function adminOrdersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.provider) filter.provider = query.provider;
    if (query.search) {
      filter.$or = [
        { publicInvoiceId: { $regex: query.search, $options: 'i' } },
        { requestId: { $regex: query.search, $options: 'i' } },
        { orderId: { $regex: query.search, $options: 'i' } },
        { merchantName: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
      if (query.endDate) (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
    }

    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      PaymentRequest.find(filter)
        .populate('transactionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (error) { next(error); }
}

/* ────────── Customers (Admin) ────────── */
export async function adminCustomersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.$or = [
        { customerName: { $regex: query.search, $options: 'i' } },
        { customerPhone: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.provider) filter.provider = query.provider;
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
      if (query.endDate) (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
    }

    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Distinct customer aggregate: group by normalized phone/name, sum paid amounts.
    const customersAgg = await Transaction.aggregate([
      { $match: { ...filter, customerPhone: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: { phone: '$customerPhone', name: '$customerName' },
          name: { $first: '$customerName' },
          phone: { $first: '$customerPhone' },
          totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          orderCount: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          lastOrderAt: { $max: '$createdAt' },
          providers: { $addToSet: '$provider' },
        },
      },
      { $sort: { lastOrderAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalAgg = await Transaction.aggregate([
      { $match: { ...filter, customerPhone: { $exists: true, $ne: '' } } },
      {
        $group: { _id: { phone: '$customerPhone', name: '$customerName' } },
      },
      { $count: 'total' },
    ]);

    const total = totalAgg[0]?.total || 0;

    res.json({
      success: true,
      data: {
        customers: customersAgg,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (error) { next(error); }
}

/* ────────── Refunds ────────── */
export async function createRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const refund = await refundService.createRefund({
      ...req.body,
      processedBy: req.user?.sub,
    });
    res.status(201).json({ success: true, data: refund });
  } catch (error) { next(error); }
}

export async function getRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const refund = await refundService.getRefund(String(req.params.refundId));
    res.json({ success: true, data: refund });
  } catch (error) { next(error); }
}

export async function listRefundsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.listRefunds(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function processRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.processRefund(
      String(req.params.refundId),
      req.user?.sub as string,
      String(req.body.action) as 'approve' | 'reject',
      req.body.notes
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function cancelRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.cancelRefund(
      String(req.params.refundId),
      req.user?.sub as string,
      req.body.reason
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function refundStatsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await refundService.getRefundStats();
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
}

export async function refundableAmountController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.getRefundableAmount(String(req.params.transactionId));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── Reconciliation ────────── */
export async function reconciliationSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await reconciliationService.getReconciliationSummary(req.query as any);
    res.json({ success: true, data: summary });
  } catch (error) { next(error); }
}

export async function reconciliationMismatchesController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reconciliationService.getMismatches(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function reconciliationDailyController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reconciliationService.getDailyReconciliation(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── Security Center ────────── */
export async function activeSessionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await securityService.getActiveSessions(req.query.userId as string);
    res.json({ success: true, data: { sessions } });
  } catch (error) { next(error); }
}

export async function revokeAdminSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await securityService.revokeSession(String(req.params.sessionId), req.user?.sub as string);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function revokeAllSessionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await securityService.revokeAllSessions(
      String(req.body.userId || req.user?.sub),
      req.user?.sub
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function loginHistoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await securityService.getLoginHistory(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function failedLoginAttemptsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await securityService.getFailedLoginAttempts(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function securityOverviewController(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await securityService.getSecurityOverview();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── System Health ────────── */
export async function systemHealthController(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await systemHealthService.getSystemHealth();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function systemUptimeController(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await systemHealthService.getUptime();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function systemResourcesController(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await systemHealthService.getResourceUsage();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── Notifications ────────── */
export async function notificationPreferencesController(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.getNotificationPreferences();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function updateNotificationPreferencesController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.updateNotificationPreferences(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function notificationLogController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.getNotificationLog(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function sendTestNotificationController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.sendTestNotification(
      (String(req.body.type || 'email') as 'email' | 'webhook'),
      String(req.body.destination || '')
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}
