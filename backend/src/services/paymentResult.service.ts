import crypto from 'node:crypto';
import PaymentResult from '../models/PaymentResult.js';
import { generateRequestId } from '../utils/index.js';

const RESULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hash the raw token with SHA-256. Only the hash is persisted — the raw token
 * lives solely in the redirect URL handed to the customer's browser.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export interface CreatePaymentResultInput {
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
}

export interface CreatePaymentResultOutput {
  requestId: string;
  rawToken: string;
  expiresAt: Date;
  amount: number;
}

/**
 * Create a one-time payment result. The raw token is returned exactly once
 * (for the redirect URL) — only its SHA-256 hash is stored.
 */
export async function createPaymentResult(
  input: CreatePaymentResultInput
): Promise<CreatePaymentResultOutput> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const requestId = generateRequestId();
  const expiresAt = Date.now() + RESULT_TTL_MS;
  const amount = Math.round(input.amount);

  await PaymentResult.create({
    requestId,
    secureTokenHash: hashToken(rawToken),
    paymentRequestId: input.paymentRequestId || '',
    orderId: input.orderId || '',
    provider: input.provider,
    amount: Math.round(input.amount),
    currency: input.currency || 'BDT',
    payerDetails: input.payerDetails || {},
    status: 'pending',
    expiresAt,
  });

  return { requestId, rawToken, expiresAt: new Date(expiresAt), amount };
}

export interface ResolvedPaymentResult {
  requestId: string;
  provider: string;
  amount: number;
  currency: string;
  orderId: string;
  payerDetails: {
    payerNumber: string;
    trxId: string;
    merchantName: string;
  };
}

/**
 * Verify + consume a payment result. Uses findOneAndDelete so a token can be
 * redeemed exactly once — a second attempt (replay) returns null even if two
 * requests race. Token comparison uses timingSafeEqual.
 */
export async function verifyPaymentResult(
  requestId: string,
  rawToken: string,
  ip?: string
): Promise<ResolvedPaymentResult | null> {
  const candidate = crypto.createHash('sha256').update(rawToken).digest('hex');
  const doc = await PaymentResult.findOne({ requestId }).lean();
  if (!doc) return null;

  const expected = Buffer.from(doc.secureTokenHash);
  const actual = Buffer.from(candidate);
  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return null;
  }

  const consumed = await PaymentResult.findOneAndDelete({ requestId }).lean();
  if (!consumed) return null; // Already consumed by a concurrent request.

  return {
    requestId: consumed.requestId,
    provider: consumed.provider,
    amount: consumed.amount,
    currency: consumed.currency || 'BDT',
    orderId: consumed.orderId || '',
    payerDetails: {
      payerNumber: consumed.payerDetails?.payerNumber || '',
      trxId: consumed.payerDetails?.trxId || '',
      merchantName: consumed.payerDetails?.merchantName || '',
    },
  };
}
