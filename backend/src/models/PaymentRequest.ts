import mongoose, { Document, Schema } from 'mongoose';
import type { PaymentProvider, TransactionStatus } from './Transaction.js';

export interface IPaymentRequest extends Document {
  requestId: string;
  /**
   * High-entropy public invoice ID (e.g. INV-7K4X9P2M8Q) used in URLs.
   * Never expose the internal `requestId` or MongoDB `_id` publicly.
   */
  publicInvoiceId?: string;
  /**
   * SHA-256 hash of the raw invoice access token. The raw token is shown to
   * the customer once (in the invoice URL) and is never persisted.
   */
  secureTokenHash?: string;
  /** Server-authoritative creation time of the invoice (distinct from `createdAt` which also records system writes). */
  invoiceCreatedAt?: Date;
  /** Server-authoritative expiry: `invoiceCreatedAt + INVOICE_EXPIRY_MINUTES`. */
  invoiceExpiresAt?: Date;
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
    publicInvoiceId: {
      type: String,
      unique: true,
      index: true,
      sparse: true,  // legacy docs (pre-migration) will not have this field
      match: /^INV-[A-Z0-9]+$/,
    },
    secureTokenHash: {
      type: String,
      unique: true,
      index: true,
      sparse: true,
      select: false,  // never included in queries by default — prevents token hash leakage
    },
    invoiceCreatedAt: {
      type: Date,
      sparse: true,
    },
    invoiceExpiresAt: {
      type: Date,
      sparse: true,
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
      // Custom provider codes allowed (e.g. Bangla QR providers). SMS
      // auto-verification only matches the core wallets, so a custom provider
      // simply stays pending until manual verification.
      type: String,
      match: /^[a-z0-9]{1,20}$/,
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
      enum: ['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled', 'rejected'],
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
// Efficient sweep: find pending invoices whose secure-expiry passed.
paymentRequestSchema.index({ status: 1, invoiceExpiresAt: 1 });

export const PaymentRequest = mongoose.model<IPaymentRequest>('PaymentRequest', paymentRequestSchema);
