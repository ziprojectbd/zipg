import mongoose from 'mongoose';

/**
 * One-time, expiring payment result record.
 *
 * When a customer completes payment on the gateway's secure invoice page, the
 * gateway stores a PaymentResult and redirects the browser to the main site's
 * `/payment/process` URL carrying only `?resultId=<requestId>&token=<rawToken>`.
 * The main site then resolves the result server-to-server (never via browser
 * data), which verifies the token and consumes the record exactly once.
 *
 * Security model:
 *  - `requestId` (public, in the redirect URL) is random and unguessable.
 *  - `secureTokenHash` stores only a SHA-256 hash — the raw token is returned
 *    exactly once (in the redirect) and never persisted.
 *  - Records expire via TTL index; consumed records are deleted atomically
 *    (findOneAndDelete) so the token cannot be replayed.
 */
const paymentResultSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    secureTokenHash: {
      type: String,
      required: true,
      trim: true,
    },
    // Link back to the minted invoice this result belongs to.
    paymentRequestId: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    // Payload the main site needs to complete the order idempotently.
    orderId: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: false,
      default: 'BDT',
      trim: true,
    },
    // Mobile wallet details collected on the gateway invoice form.
    payerDetails: {
      type: {
        payerNumber: { type: String, default: '' },
        trxId: { type: String, default: '' },
        merchantName: { type: String, default: '' },
      },
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'expired'],
      default: 'pending',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedByIp: {
      type: String,
      default: '',
    },
    // Unix ms expiry for the TTL index (auto-delete of stale results).
    expiresAt: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete results after they expire (default 30 minutes).
paymentResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

if (mongoose.models.PaymentResult) {
  delete mongoose.models.PaymentResult;
}

export default mongoose.model('PaymentResult', paymentResultSchema);

export interface IPaymentResult {
  requestId: string;
  secureTokenHash: string;
  paymentRequestId?: string;
  orderId?: string;
  provider: string;
  amount: number;
  currency?: string;
  payerDetails?: {
    payerNumber?: string;
    trxId?: string;
    merchantName?: string;
  };
  status?: 'pending' | 'resolved' | 'expired';
  resolvedAt?: Date | null;
  resolvedByIp?: string;
  expiresAt: number;
  createdAt?: Date;
  updatedAt?: Date;
}
