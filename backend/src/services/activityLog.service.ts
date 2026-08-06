import { ActivityLog, type ActivityAction, type ActivitySeverity } from '../models/index.js';

interface LogOptions {
  userId?: string;
  action: ActivityAction;
  severity?: ActivitySeverity;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function createActivityLog(options: LogOptions): Promise<void> {
  try {
    await ActivityLog.create({
      userId: options.userId || undefined,
      action: options.action,
      severity: options.severity || 'info',
      message: options.message,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      entityType: options.entityType,
      entityId: options.entityId,
      metadata: options.metadata,
    });
  } catch (error) {
    console.error('[zi-pay] Failed to create activity log:', error);
  }
}

export async function getActivityLogs(query: {
  userId?: string;
  action?: string;
  severity?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const filter: Record<string, unknown> = {};

  if (query.userId) filter.userId = query.userId;
  if (query.action) filter.action = query.action;
  if (query.severity) filter.severity = query.severity;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.entityId) filter.entityId = query.entityId;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) (filter.createdAt as Record<string, unknown>).$gte = query.startDate;
    if (query.endDate) (filter.createdAt as Record<string, unknown>).$lte = query.endDate;
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

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
