import mongoose, { Schema } from 'mongoose';
const activityLogSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    action: {
        type: String,
        required: true,
        index: true,
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info',
        index: true,
    },
    message: {
        type: String,
        required: true,
    },
    ipAddress: String,
    userAgent: String,
    entityType: {
        type: String,
        index: true,
    },
    entityId: {
        type: String,
        index: true,
    },
    metadata: Schema.Types.Mixed,
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });
// Auto-expire after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
