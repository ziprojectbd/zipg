import { Session, User, ActivityLog } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';

/* ────────── Types ────────── */

interface PaginationQuery {
  page?: number;
  limit?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/* ────────── Active Sessions ────────── */

export async function getActiveSessions(userId?: string) {
  const filter: Record<string, unknown> = {
    isActive: true,
    expiresAt: { $gt: new Date() },
  };

  if (userId) {
    filter.userId = userId;
  }

  const sessions = await Session.find(filter)
    .populate('userId', 'name email role')
    .sort({ lastActivityAt: -1 })
    .lean();

  return sessions;
}

/* ────────── Revoke Session ────────── */

export async function revokeSession(sessionId: string, adminId: string) {
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  if (!session.isActive) {
    throw new AppError('Session is already inactive', 400, 'SESSION_INACTIVE');
  }

  session.isActive = false;
  await session.save();

  await createActivityLog({
    userId: adminId,
    action: 'security_event',
    severity: 'warning',
    message: `Session revoked by admin`,
    entityType: 'Session',
    entityId: sessionId,
    metadata: {
      revokedUserId: session.userId.toString(),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    },
  });

  return { success: true, message: 'Session revoked successfully' };
}

/* ────────── Revoke All Sessions ────────── */

export async function revokeAllSessions(
  userId: string,
  exceptCurrent?: string
) {
  const filter: Record<string, unknown> = {
    userId,
    isActive: true,
  };

  if (exceptCurrent) {
    filter._id = { $ne: exceptCurrent };
  }

  const result = await Session.updateMany(filter, {
    $set: { isActive: false },
  });

  await createActivityLog({
    userId,
    action: 'security_event',
    severity: 'warning',
    message: `All sessions revoked${exceptCurrent ? ' (except current)' : ''}`,
    entityType: 'Session',
    metadata: {
      revokedCount: result.modifiedCount,
      exceptCurrent: exceptCurrent || null,
    },
  });

  return {
    success: true,
    revokedCount: result.modifiedCount,
    message: `${result.modifiedCount} session(s) revoked`,
  };
}

/* ────────── Login History ────────── */

export async function getLoginHistory(query: PaginationQuery = {}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    action: { $in: ['login', 'logout'] },
  };

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(query.startDate);
    if (query.endDate) (filter.createdAt as Record<string, Date>).$lte = new Date(query.endDate);
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('userId', 'name email role')
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

/* ────────── Security Overview ────────── */

export async function getSecurityOverview() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    activeSessionsCount,
    failedLogins,
    totalUsers,
    usersWithActiveSessions,
  ] = await Promise.all([
    Session.countDocuments({
      isActive: true,
      expiresAt: { $gt: now },
    }),
    ActivityLog.countDocuments({
      action: { $in: ['invalid_token_attempt', 'security_event'] },
      createdAt: { $gte: twentyFourHoursAgo },
    }),
    User.countDocuments({ isActive: true }),
    Session.aggregate([
      { $match: { isActive: true, expiresAt: { $gt: now } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]),
  ]);

  return {
    activeSessions: activeSessionsCount,
    failedLogins,
    totalUsers,
    usersWithActiveSessions: usersWithActiveSessions[0]?.count || 0,
    period: 'last_24_hours',
  };
}

/* ────────── Failed Login Attempts ────────── */

export async function getFailedLoginAttempts(query: PaginationQuery = {}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    action: { $in: ['invalid_token_attempt', 'security_event'] },
  };

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(query.startDate);
    if (query.endDate) (filter.createdAt as Record<string, Date>).$lte = new Date(query.endDate);
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('userId', 'name email role')
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
