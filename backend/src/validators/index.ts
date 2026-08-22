import { z } from 'zod';

/* ────────── Auth ────────── */
export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/* ────────── User ────────── */
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(120),
  role: z.enum(['super_admin', 'admin', 'operator']),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(120).optional(),
  role: z.enum(['super_admin', 'admin', 'operator']).optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().optional(),
});

/* ────────── Payment / Transaction ────────── */
/** Provider code — any lowercase slug (core wallets + custom Bangla QR providers). */
const providerCode = z.string().regex(/^[a-z0-9]{1,20}$/, 'Invalid provider code');

export const publicPaymentSchema = z.object({
  amount: z.number().positive().max(10_000_000).transform(Math.round),
  provider: providerCode,
  customerName: z.string().min(2).max(120).optional(),
  customerPhone: z.string().regex(/^01\d{9}$/, 'Must be a valid Bangladeshi mobile number').optional(),
  trxId: z.string().trim().min(3).max(80),
  currency: z.string().length(3).default('BDT'),
  description: z.string().max(240).optional(),
  merchantName: z.string().trim().max(200).optional(),
  merchantAccount: z.string().trim().max(20).optional(),
  orderId: z.string().trim().max(100).optional(),
  callbackUrl: z.string().url().optional(),
});

/* ── Public invoice lookup ── */
export const requestIdParamSchema = z.object({
  requestId: z.string().trim().min(3).max(200),
});

/* ── Secure invoice access ── */
/** Params: /api/invoices/:invoiceId */
export const invoiceAccessParamsSchema = z.object({
  invoiceId: z.string().regex(/^INV-[A-Z0-9]{1,20}$/, 'Malformed invoice ID'),
});

/** Query: ?token=<64-hex> */
export const invoiceAccessQuerySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Malformed or oversized invoice token'),
});

/** Invoice mint body — called by the frontend when no server-side record exists yet (legacy Main Site redirect). */
export const invoiceMintSchema = z.object({
  // Normalized to whole taka (round-to-nearest) — the main site sends the
  // same integer it computed server-side, but we re-normalize defensively so
  // a fractional amount can never mint a fractional invoice.
  amount: z.number().positive().max(10_000_000).transform(Math.round),
  provider: providerCode,
  currency: z.string().length(3).default('BDT').optional(),
  merchantName: z.string().trim().max(200).optional(),
  merchantAccount: z.string().trim().max(20).optional(),
  orderId: z.string().trim().max(100).optional(),
});

export const merchantPaymentSchema = z.object({
  amount: z.number().positive().max(10_000_000).transform(Math.round),
  currency: z.string().length(3).default('BDT'),
  provider: providerCode,
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().regex(/^01\d{9}$/, 'Must be a valid Bangladeshi mobile number'),
  description: z.string().max(240).optional(),
  callbackUrl: z.string().url().optional(),
  redirectUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateTransactionSchema = z.object({
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled', 'rejected']).optional(),
  notes: z.string().max(500).optional(),
});

/* ────────── Device ────────── */
export const registerDeviceSchema = z.object({
  deviceId: z.string().min(3).max(100),
  name: z.string().min(1).max(100),
  provider: z.enum(['bkash', 'nagad', 'rocket', 'upay']),
  phoneNumber: z.string().min(8).max(20),
  androidVersion: z.string().optional(),
  appVersion: z.string().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.enum(['bkash', 'nagad', 'rocket', 'upay']).optional(),
  isEnabled: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  phoneNumber: z.string().min(8).max(20).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
  androidVersion: z.string().optional(),
  appVersion: z.string().optional(),
});

export const deviceHeartbeatSchema = z.object({
  deviceId: z.string().min(3),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
  androidVersion: z.string().optional(),
  appVersion: z.string().optional(),
});

/* ────────── SMS ────────── */
export const smsPayloadSchema = z.object({
  deviceId: z.string().min(3),
  provider: z.enum(['bkash', 'nagad', 'rocket', 'upay']),
  transactionId: z.string().min(3).max(80),
  sender: z.string().min(1).max(30),
  phone: z.string().min(8).max(20),
  amount: z.number().positive(),
  receivedAt: z.string().datetime().optional(),
  sms: z.string().min(10).max(1000),
});

/* ────────── API Key ────────── */
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  merchantId: z.string().min(1).max(100),
  merchantName: z.string().min(1).max(200),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  ipWhitelist: z.array(z.string()).optional(),
});

export const updateApiKeySchema = z.object({
  isActive: z.boolean().optional(),
  isRevoked: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
  ipWhitelist: z.array(z.string()).optional(),
});

/* ────────── Webhook ────────── */
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(
    z.enum([
      'payment.created',
      'payment.paid',
      'payment.failed',
      'payment.expired',
      'payment.cancelled',
      'payment.verified',
    ])
  ),
  secret: z.string().min(16).optional(),
  isActive: z.boolean().default(true),
  maxRetries: z.number().min(0).max(10).default(3),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(
    z.enum([
      'payment.created',
      'payment.paid',
      'payment.failed',
      'payment.expired',
      'payment.cancelled',
      'payment.verified',
    ])
  ).optional(),
  isActive: z.boolean().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
});

/* ────────── Settings ────────── */
export const updatePaySettingsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  showBranding: z.boolean().optional(),
  primaryColor: z.string().max(30).optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  merchantName: z.string().max(200).optional(),
  merchantAccount: z.string().max(30).optional(),
  invoiceHeading: z.string().max(200).optional(),
  invoiceDescription: z.string().max(500).optional(),
  footerText: z.string().max(200).optional(),
  securedByText: z.string().max(200).optional(),
  supportEmail: z.string().max(200).optional(),
  supportPhone: z.string().max(30).optional(),
  pendingPaymentMessage: z.string().max(500).optional(),
  pendingVerificationMessage: z.string().max(500).optional(),
  paidMessage: z.string().max(500).optional(),
  expiredMessage: z.string().max(500).optional(),
  cancelledMessage: z.string().max(500).optional(),
  rejectedMessage: z.string().max(500).optional(),
  supportMessage: z.string().max(500).optional(),
});

export const updateSystemSettingsSchema = z.object({
  siteName: z.string().min(1).max(200).optional(),
  defaultCurrency: z.string().length(3).optional(),
  paymentExpiryMinutes: z.number().min(1).max(1440).optional(),
  maxPaymentAmount: z.number().positive().optional(),
  minPaymentAmount: z.number().positive().optional(),
  enablePublicPayments: z.boolean().optional(),
  enableMerchantSignup: z.boolean().optional(),
  webhookRetryMax: z.number().min(0).max(10).optional(),
  webhookRetryDelayMs: z.number().min(1000).max(60000).optional(),
  maintenanceMode: z.boolean().optional(),
});

/* ────────── Payment Method ────────── */
export const updatePaymentMethodSchema = z.object({
  code: z.string().regex(/^[a-z0-9]{1,20}$/, 'Code must be a lowercase slug').optional(),
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  processingFee: z.number().min(0).optional(),
  processingFeeType: z.enum(['fixed', 'percentage']).optional(),
  accountNumber: z.string().min(1).max(20).optional(),
  accountName: z.string().max(200).optional(),
  accountType: z.enum(['personal', 'merchant']).optional(),
  qrImageUrl: z.string().max(1000).optional(),
  icon: z.string().max(1000).optional(),
  steps: z.array(z.string().max(300)).optional(),
  warning: z.string().max(500).optional(),
  notice: z.string().max(500).optional(),
  color: z.string().max(30).optional(),
  supportPhone: z.string().max(30).optional(),
  sortOrder: z.number().optional(),
});

/** Create a new payment method (new provider, e.g. upay or a Bangla QR provider). */
export const createPaymentMethodSchema = updatePaymentMethodSchema.extend({
  code: z.string().regex(/^[a-z0-9]{1,20}$/, 'Code must be a lowercase slug'),
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(20),
});

/** Reorder payment methods by array of provider codes. */
export const reorderPaymentMethodsSchema = z.object({
  codes: z.array(z.string().regex(/^[a-z0-9]{1,20}$/)).min(1),
});

/* ────────── SMS Parser / Manual Verification ────────── */

/** New raw SMS payload — Android device sends raw SMS text for server-side parsing */
export const rawSmsPayloadSchema = z.object({
  deviceId: z.string().min(3),
  rawSms: z.string().min(10).max(2000),
  sender: z.string().min(1).max(30),
  provider: z.enum(['bkash', 'nagad', 'rocket', 'upay']).optional(),
  receivedAt: z.string().datetime().optional(),
});

/** Admin test parser endpoint */
export const testSmsParserSchema = z.object({
  rawSms: z.string().min(10).max(2000),
  provider: z.enum(['bkash', 'nagad', 'rocket', 'upay']).optional(),
});

/** Admin update parser rules */
export const updateSmsParserRulesSchema = z.object({
  parserRules: z.record(z.string(), z.string()),
});

/** Manual verify */
export const manualVerifySchema = z.object({
  notes: z.string().max(500).optional(),
});

/** Manual reject */
export const manualRejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

/* ────────── Refund ────────── */
export const createRefundSchema = z.object({
  transactionId: z.string().min(3),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
});

export const processRefundSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
});

export const cancelRefundSchema = z.object({
  reason: z.string().max(500).optional(),
});

/* ────────── Query Params ────────── */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().default('-createdAt'),
  search: z.string().optional(),
  status: z.string().optional(),
  provider: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const analyticsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  provider: z.string().optional(),
});

/* ────────── System Settings (re-export) ────────── */
export {
  updateGeneralSettingsSchema,
  updateGatewaySettingsSchema,
  updateSecuritySettingsSchema,
  updateSmsSettingsSchema,
  updateDeviceSettingsSchema,
  updateMerchantSettingsSchema,
  updateNotificationSettingsSchema,
  updateEmailSettingsSchema,
  updateApiSettingsSchema,
  updateAppearanceSettingsSchema,
  updateAnalyticsSettingsSchema,
  testEmailSchema,
} from './settings.validators.js';
