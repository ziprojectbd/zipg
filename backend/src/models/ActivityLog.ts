import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'token_refresh'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'payment_created'
  | 'payment_verified'
  | 'payment_paid'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_expired'
  | 'invoice_created'
  | 'invoice_accessed'
  | 'invoice_paid'
  | 'invoice_expired'
  | 'invoice_access_denied'
  | 'invalid_token_attempt'
  | 'device_registered'
  | 'device_enabled'
  | 'device_disabled'
  | 'device_online'
  | 'device_offline'
  | 'sms_received'
  | 'webhook_delivered'
  | 'webhook_failed'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'refund_requested'
  | 'refund_approved'
  | 'refund_rejected'
  | 'refund_cancelled'
  | 'refund_completed'
  | 'settings_updated'
  | 'security_event'
  | 'session_revoked'
  | 'notification_sent'
  | 'notification_failed'
  | 'reconciliation_check'
  | 'error'
  | 'system';

export type ActivitySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface IActivityLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: ActivityAction;
  severity: ActivitySeverity;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });

// Auto-expire after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
