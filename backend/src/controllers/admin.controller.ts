import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';
import * as apiKeyService from '../services/apiKey.service.js';
import * as analyticsService from '../services/analytics.service.js';
import * as settingsService from '../services/settings.service.js';
import * as activityLogService from '../services/activityLog.service.js';
import { PaymentMethod } from '../models/index.js';

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
