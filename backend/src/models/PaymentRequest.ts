import mongoose, { Document, Schema } from 'mongoose';
import type { PaymentProvider, TransactionStatus } from './Transaction.js';

export interface IPaymentRequest extends Document {
  requestId: string;
  merchantId?: string;
  apiKeyId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  customerName?: string;
  customerPhone?: string;
  customerTransactionId?: string;
  description?: string;
  status: TransactionStatus;
  callbackUrl?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
  transactionId?: string;
  expiresAt: Date;
  /** Merchant store name — stored on creation, never trusted from the client after that. */
  merchantName?: string;
  /** Merchant payment account number (bKash / Nagad / Rocket). */
  merchantAccount?: string;
  /** External order ID from the merchant store. */
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRequestSchema = new Schema<IPaymentRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
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
    provider: {
      type: String,
      enum: ['bkash', 'nagad', 'rocket'],
      required: true,
      index: true,
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
    },
    customerTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    callbackUrl: String,
    redirectUrl: String,
    metadata: Schema.Types.Mixed,
    transactionId: String,
    merchantName: {
      type: String,
      trim: true,
      default: '',
    },
    merchantAccount: {
      type: String,
      trim: true,
      default: '',
    },
    orderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
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

paymentRequestSchema.index({ provider: 1, status: 1 });
paymentRequestSchema.index({ status: 1, createdAt: -1 });

export const PaymentRequest = mongoose.model<IPaymentRequest>('PaymentRequest', paymentRequestSchema);
