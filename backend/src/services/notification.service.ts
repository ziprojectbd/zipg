import { ActivityLog, SystemSettings, type ISysSettingsDoc } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';

/* ────────── Types ────────── */

interface NotificationPreferences {
  emailNotifications: boolean;
  paymentAlerts: boolean;
  securityAlerts: boolean;
  dailySummary: boolean;
}

interface NotificationLogQuery {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

/* ────────── Helpers ────────── */

async function getOrCreateSettings(
  group: string,
  key: string
): Promise<ISysSettingsDoc> {
  let doc = await SystemSettings.findOne({ group, key });
  if (!doc) {
    doc = await SystemSettings.create({
      group,
      key,
      value: {},
    });
  }
  return doc;
}

/* ────────── Notification Preferences ────────── */

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const doc = await getOrCreateSettings('notification', 'config');
  const value = doc.value as Record<string, unknown>;

  return {
    emailNotifications:
      (value.emailNotifications as boolean) ?? true,
    paymentAlerts:
      (value.paymentSuccessNotify as boolean) ??
      (value.paymentAlerts as boolean) ??
      true,
    securityAlerts:
      (value.securityAlerts as boolean) ?? true,
    dailySummary:
      (value.dailySummary as boolean) ?? false,
  };
}

export async function updateNotificationPreferences(
  data: Record<string, unknown>
): Promise<NotificationPreferences> {
  const doc = await getOrCreateSettings('notification', 'config');
  const previous = { ...(doc.value as Record<string, unknown>) };
  const merged = { ...previous, ...data };

  doc.value = merged;
  await doc.save();

  await createActivityLog({
    action: 'settings_updated',
    message: 'Notification preferences updated',
    entityType: 'SystemSettings',
    entityId: 'notification/config',
    severity: 'info',
    metadata: { changes: data, previous },
  });

  return {
    emailNotifications:
      (merged.emailNotifications as boolean) ?? true,
    paymentAlerts:
      (merged.paymentSuccessNotify as boolean) ??
      (merged.paymentAlerts as boolean) ??
      true,
    securityAlerts:
      (merged.securityAlerts as boolean) ?? true,
    dailySummary:
      (merged.dailySummary as boolean) ?? false,
  };
}

/* ────────── Notification Log ────────── */

const NOTIFICATION_ACTIONS = [
  'webhook_delivered',
  'webhook_failed',
  'payment_paid',
  'payment_failed',
  'notification_sent',
  'notification_failed',
  'sms_received',
  'device_offline',
] as const;

export async function getNotificationLog(query: NotificationLogQuery = {}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (query.type) {
    // Filter by specific action type
    filter.action = query.type;
  } else {
    // Filter by all notification-related actions
    filter.action = { $in: [...NOTIFICATION_ACTIONS] };
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate)
      (filter.createdAt as Record<string, Date>).$gte = new Date(
        query.startDate
      );
    if (query.endDate)
      (filter.createdAt as Record<string, Date>).$lte = new Date(
        query.endDate
      );
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/* ────────── Send Test Notification ────────── */

export async function sendTestNotification(
  type: 'email' | 'webhook',
  destination: string
) {
  if (!destination || destination.trim().length === 0) {
    throw new AppError(
      'Destination is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  // In a real implementation, this would delegate to an email service
  // (e.g., Nodemailer, SendGrid) or trigger a webhook POST.
  // For now we log the attempt and return success.

  await createActivityLog({
    action: 'notification_sent',
    message: `Test ${type} notification sent to ${destination}`,
    severity: 'info',
    metadata: {
      notificationType: type,
      destination,
      isTest: true,
    },
  });

  return {
    success: true,
    message: `Test ${type} notification queued for ${destination}`,
    type,
    destination,
    sentAt: new Date(),
  };
}
