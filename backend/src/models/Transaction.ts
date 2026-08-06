import mongoose, { Document, Schema } from 'mongoose';

export type TransactionStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'expired' | 'cancelled';
export type PaymentProvider = 'bkash' | 'nagad' | 'rocket';

export interface ITransaction extends Document {
  transactionId: string;
  paymentRequestId?: mongoose.Types.ObjectId;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  customerName?: string;
  customerPhone?: string;
  customerTransactionId?: string;
  status: TransactionStatus;
  merchantId?: string;
  apiKeyId?: mongoose.Types.ObjectId;
  deviceId?: string;
  smsRaw?: string;
  smsSender?: string;
  smsReceivedAt?: Date;
  verifiedAt?: Date;
  verificationMethod?: 'sms' | 'manual' | 'auto';
  metadata?: Record<string, unknown>;
  notes?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentRequest',
      index: true,
    },
    provider: {
      type: String,
      enum: ['bkash', 'nagad', 'rocket'],
      required: true,
      index: true,
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
    customerName: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    customerPhone: {
      type: String,
      required: false,
      trim: true,
      default: '',
      index: true,
    },
    customerTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    merchantId: {
      type: String,
      index: true,
    },
    apiKeyId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiKey',
    },
    deviceId: String,
    smsRaw: String,
    smsSender: String,
    smsReceivedAt: Date,
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['sms', 'manual', 'auto'],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    notes: String,
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ provider: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ merchantId: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
