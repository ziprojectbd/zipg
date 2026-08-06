import { ActivityLog } from '../models/index.js';
export async function createActivityLog(options) {
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
    }
    catch (error) {
        console.error('[zi-pay] Failed to create activity log:', error);
    }
}
export async function getActivityLogs(query) {
    const filter = {};
    if (query.userId)
        filter.userId = query.userId;
    if (query.action)
        filter.action = query.action;
    if (query.severity)
        filter.severity = query.severity;
    if (query.entityType)
        filter.entityType = query.entityType;
    if (query.entityId)
        filter.entityId = query.entityId;
    if (query.startDate || query.endDate) {
        filter.createdAt = {};
        if (query.startDate)
            filter.createdAt.$gte = query.startDate;
        if (query.endDate)
            filter.createdAt.$lte = query.endDate;
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
