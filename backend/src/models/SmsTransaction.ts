import mongoose, { Document, Schema } from 'mongoose';

export type SmsCategory = 'payment_received' | 'send_money' | 'cash_out' | 'unknown';
export type SmsStatus = 'received' | 'parsed' | 'matched' | 'verified' | 'rejected' | 'ignored';

export interface ISmsTransaction extends Document {
  /* device + source */
  deviceId: string;
  provider: string;                       // bkash | nagad | rocket | unknown
  sender: string;                         // SMS sender ID (e.g. "bKash")
  rawSms: string;                         // full raw SMS body

  /* parsed fields */
  parsedTxnId: string | null;
  parsedAmount: number | null;
  parsedPhone: string | null;
  category: SmsCategory;
  parserVersion: string;
  parseConfidence: number;                // 0–1

  /* lifecycle */
  status: SmsStatus;

  /* matching */
  matchedTransactionId?: mongoose.Types.ObjectId | null;
  matchedPaymentRequestId?: mongoose.Types.ObjectId | null;

  /* manual verification */
  verificationMethod?: 'sms' | 'manual';
  verifiedBy?: mongoose.Types.ObjectId | null;
  verificationNotes?: string;

  /* metadata / timestamps */
  metadata?: Record<string, unknown>;
  receivedAt: Date;
  parsedAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const smsTransactionSchema = new Schema<ISmsTransaction>(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['bkash', 'nagad', 'rocket', 'unknown'],
      default: 'unknown',
      index: true,
    },
    sender: {
      type: String,
      required: true,
      trim: true,
    },
    rawSms: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    parsedTxnId: {
      type: String,
      sparse: true,
      default: null,
    },
    parsedAmount: {
      type: Number,
      default: null,
    },
    parsedPhone: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: ['payment_received', 'send_money', 'cash_out', 'unknown'],
      default: 'unknown',
      index: true,
    },
    parserVersion: {
      type: String,
      default: '1.0',
    },
    parseConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    status: {
      type: String,
      enum: ['received', 'parsed', 'matched', 'verified', 'rejected', 'ignored'],
      default: 'received',
      index: true,
    },

    matchedTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    matchedPaymentRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentRequest',
      default: null,
    },

    verificationMethod: {
      type: String,
      enum: ['sms', 'manual'],
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verificationNotes: {
      type: String,
      maxlength: 500,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    parsedAt: Date,
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

smsTransactionSchema.index({ deviceId: 1, receivedAt: -1 });
smsTransactionSchema.index({ provider: 1, status: 1 });
smsTransactionSchema.index({ status: 1, createdAt: -1 });
smsTransactionSchema.index({ parsedTxnId: 1 });
smsTransactionSchema.index({ category: 1, status: 1 });

export const SmsTransaction = mongoose.model<ISmsTransaction>(
  'SmsTransaction',
  smsTransactionSchema
);
