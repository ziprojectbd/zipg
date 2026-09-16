import { Request, Response, NextFunction } from 'express';
import * as systemSettingsService from '../services/systemSettings.service.js';
import { parseSms } from '../services/smsParser.service.js';
import { ActivityLog } from '../models/index.js';

/*
 * SMS Test
 *
 * This endpoint delegates to the shared parser service instead of keeping its
 * own regex table. The duplicate copy that used to live here required the brand
 * name ("bKash") in the SMS body, so testing a real wallet SMS — which is sent
 * from a short code and never contains the brand — reported "No transaction ID
 * found" even though the live pipeline parsed the same text correctly. One
 * parser means the tester can never disagree with production.
 *
 * Accepts `smsText` (admin UI) or `rawSms` (validator schema) for the body.
 */
export async function testSmsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { smsText, rawSms, provider } = req.body as {
      smsText?: string;
      rawSms?: string;
      provider?: string;
      deviceId?: string;
    };

    const text = smsText || rawSms;

    if (!text) {
      res.status(400).json({ success: false, error: 'SMS text is required' });
      return;
    }

    // Sender doubles as the provider hint: the UI does not always send one, and
    // real SMS arrive from the wallet's short code rather than its brand name.
    const parsed = await parseSms(text, provider || 'unknown', provider);

    const issues: string[] = [...parsed.issues];

    const result: Record<string, unknown> = {
      provider: parsed.provider,
      amount: parsed.amount ?? 0,
      transactionId: parsed.transactionId,
      sender: parsed.sender,
      phone: parsed.phone ?? 'unknown',
      category: parsed.category,
      confidence: parsed.confidence,
      paymentTime: new Date().toISOString(),
      validationResult: issues.length > 0 ? 'warning' : 'success',
      finalStatus: issues.length > 0 ? 'partial' : 'detected',
      matchedOrder: null,
      rawSms: text,
    };

    await ActivityLog.create({
      action: 'sms_received',
      severity: 'info',
      message: `SMS test: ${parsed.provider} - ${result.finalStatus}`,
      entityType: 'SmsTest',
      metadata: { parsed: result, issues },
    });

    res.json({
      success: true,
      data: {
        parsed: result,
        issues,
        rawJson: result,
      },
    });
  } catch (error) { next(error); }
}

/* ────────── SMS Stats ────────── */
export async function smsStatsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayCount, failedCount, duplicateCount, pendingCount, onlineDevices] = await Promise.all([
      ActivityLog.countDocuments({ action: 'sms_received', createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ action: 'payment_failed', createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ action: 'sms_received', severity: 'warning', createdAt: { $gte: todayStart }, 'metadata.issues': { $exists: true } }),
      ActivityLog.countDocuments({ action: 'payment_created', createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ action: 'device_online' }),
    ]);

    // Hourly SMS chart
    const hourlyData = await ActivityLog.aggregate([
      { $match: { action: 'sms_received', createdAt: { $gte: todayStart } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Daily payment chart (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dailyPayments = await ActivityLog.aggregate([
      { $match: { action: 'payment_verified', createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Provider distribution
    const providerDistribution = await ActivityLog.aggregate([
      { $match: { action: 'sms_received', createdAt: { $gte: todayStart } } },
      { $group: { _id: '$entityType', count: { $sum: 1 } } },
    ]);

    const total = providerDistribution.reduce((s: number, p: any) => s + p.count, 0) || 1;

    res.json({
      success: true,
      data: {
        smsReceivedToday: todayCount,
        paymentsVerified: todayCount - failedCount,
        pendingPayments: pendingCount,
        failedVerification: failedCount,
        duplicateSms: duplicateCount,
        onlineDevices,
        charts: {
          hourly: hourlyData.map((h: any) => ({ hour: h._id, count: h.count })),
          daily: dailyPayments.map((d: any) => ({ date: d._id, count: d.count })),
          providerDistribution: providerDistribution.map((p: any) => ({
            name: p._id || 'other',
            count: p.count,
            percentage: Math.round((p.count / total) * 100),
          })),
          successRate: todayCount > 0 ? Math.round(((todayCount - failedCount) / todayCount) * 100) : 0,
        },
      },
    });
  } catch (error) { next(error); }
}

/* ────────── SMS Logs ────────── */
export async function smsLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = Math.min(parseInt(String(req.query.limit || '20')), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const type = String(req.query.type || 'all');

    const filter: Record<string, unknown> = {};
    if (type !== 'all') filter.action = type;
    if (search) {
      filter.$or = [
        { 'metadata.parsed.transactionId': { $regex: search, $options: 'i' } },
        { 'metadata.parsed.phone': { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { logs, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
}

/* ────────── SMS Cleanup ────────── */
export async function smsCleanupController(_req: Request, res: Response, next: NextFunction) {
  try {
    const retentionDays = 90;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await ActivityLog.deleteMany({
      action: 'sms_received',
      createdAt: { $lt: cutoff },
    });
    res.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (error) { next(error); }
}
