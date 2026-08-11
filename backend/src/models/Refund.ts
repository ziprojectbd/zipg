import mongoose, { Document, Schema } from 'mongoose';

export type RefundStatus = 'requested' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface IRefund extends Document {
  refundId: string;
  transactionId: string;
  transactionRef?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  adminNotes?: string;
  processedBy?: mongoose.Types.ObjectId;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      index: true,
    },
    transactionRef: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'BDT',
      length: 3,
    },
    status: {
      type: String,
      enum: ['requested', 'processing', 'success', 'failed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
    adminNotes: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    failureReason: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

refundSchema.index({ transactionId: 1, status: 1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ createdAt: -1 });

export const Refund = mongoose.model<IRefund>('Refund', refundSchema);
