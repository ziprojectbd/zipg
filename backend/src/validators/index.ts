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
export const publicPaymentSchema = z.object({
  amount: z.number().positive().max(10_000_000),
  provider: z.enum(['bkash', 'nagad', 'rocket']),
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

export const merchantPaymentSchema = z.object({
  amount: z.number().positive().max(10_000_000),
  currency: z.string().length(3).default('BDT'),
  provider: z.enum(['bkash', 'nagad', 'rocket']),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().regex(/^01\d{9}$/, 'Must be a valid Bangladeshi mobile number'),
  description: z.string().max(240).optional(),
  callbackUrl: z.string().url().optional(),
  redirectUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateTransactionSchema = z.object({
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
});

/* ────────── Device ────────── */
export const registerDeviceSchema = z.object({
  deviceId: z.string().min(3).max(100),
  name: z.string().min(1).max(100),
  provider: z.enum(['bkash', 'nagad', 'rocket']),
  phoneNumber: z.string().min(8).max(20),
  androidVersion: z.string().optional(),
  appVersion: z.string().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.enum(['bkash', 'nagad', 'rocket']).optional(),
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
  provider: z.enum(['bkash', 'nagad', 'rocket']),
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
  enabledProviders: z.array(z.enum(['bkash', 'nagad', 'rocket'])).optional(),
  merchantBkashNumber: z.string().max(20).optional(),
  merchantNagadNumber: z.string().max(20).optional(),
  merchantRocketNumber: z.string().max(20).optional(),
  instructions: z.object({
    bkash: z.string().max(500),
    nagad: z.string().max(500),
    rocket: z.string().max(500),
  }).partial().optional(),
  showBranding: z.boolean().optional(),
  primaryColor: z.string().max(30).optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
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
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  processingFee: z.number().min(0).optional(),
  processingFeeType: z.enum(['fixed', 'percentage']).optional(),
  accountNumber: z.string().min(1).max(20).optional(),
  instructions: z.string().max(500).optional(),
  sortOrder: z.number().optional(),
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
