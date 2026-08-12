import { Settings } from '../models/index.js';
import type { IPaySettings, ISystemSettings } from '../models/Settings.js';
import { createActivityLog } from './activityLog.service.js';
import { cacheGet, cacheSet, cacheDel } from './cache.service.js';

export const PAY_SETTINGS_CACHE_KEY = 'pay_settings_public';

const DEFAULT_PAY_SETTINGS: IPaySettings = {
  title: 'ZI PREMIUM SERVICES',
  subtitle: 'Secure checkout',
  description: 'Complete your payment through bKash, Nagad, or Rocket. Your transaction will be verified automatically.',
  enabledProviders: ['bkash', 'nagad', 'rocket'],
  merchantBkashNumber: '01614602084',
  merchantNagadNumber: '01614602084',
  merchantRocketNumber: '01614602084',
  instructions: {
    bkash: 'Send money to the bKash number shown by the merchant.',
    nagad: 'Send money to the Nagad number shown by the merchant.',
    rocket: 'Send money to the Rocket number shown by the merchant.',
  },
  showBranding: true,
  primaryColor: '#8b5cf6',
  merchantName: 'ZI Premium Services',
  merchantAccount: '01614602084',
  invoiceHeading: 'Complete Your Payment',
  invoiceDescription: 'Pay securely using your preferred mobile wallet. Your payment will be verified automatically.',
  footerText: 'Powered by ZiPAY',
  supportEmail: 'support@zipremiumservices.com',
  supportPhone: '01614602084',
  pendingPaymentMessage: 'Please complete your payment using the instructions below. Your invoice will expire soon.',
  pendingVerificationMessage:
    'Your payment has been received and is being verified. We will confirm your order shortly. Please do not close this page.',
  paidMessage: 'Your payment has been verified successfully. Thank you for your purchase!',
  expiredMessage: 'This invoice has expired. Please create a new payment request to continue.',
  cancelledMessage: 'This payment request has been cancelled.',
  rejectedMessage: 'Your payment could not be verified. Please contact support for assistance.',
  supportMessage: 'Need help with your payment? Contact our support team.',
};

const DEFAULT_SYSTEM_SETTINGS: ISystemSettings = {
  siteName: 'ZI Pay',
  siteUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  defaultCurrency: 'BDT',
  paymentExpiryMinutes: 15,
  maxPaymentAmount: 10000000,
  minPaymentAmount: 1,
  enablePublicPayments: true,
  enableMerchantSignup: false,
  webhookRetryMax: 3,
  webhookRetryDelayMs: 5000,
  maintenanceMode: false,
};

export async function getPaySettings(): Promise<IPaySettings> {
  const cached = cacheGet<IPaySettings>(PAY_SETTINGS_CACHE_KEY);
  if (cached) return cached;

  const doc = await Settings.findOne({ key: 'pay_settings', group: 'pay' });
  const result = (doc?.value as IPaySettings) || DEFAULT_PAY_SETTINGS;
  cacheSet(PAY_SETTINGS_CACHE_KEY, result, 60);
  return result;
}

export async function updatePaySettings(
  data: Partial<IPaySettings>,
  userId?: string
): Promise<IPaySettings> {
  const current = await getPaySettings();
  const updated: IPaySettings = {
    ...current,
    ...data,
    instructions: { ...current.instructions, ...(data.instructions ?? {}) },
  };

  await Settings.findOneAndUpdate(
    { key: 'pay_settings', group: 'pay' },
    {
      key: 'pay_settings',
      group: 'pay',
      value: updated,
      updatedBy: userId,
    },
    { upsert: true, new: true }
  );

  // Invalidate the public cache so the invoice page sees the change immediately.
  cacheDel(PAY_SETTINGS_CACHE_KEY);

  await createActivityLog({
    userId,
    action: 'settings_updated',
    message: 'Payment gateway settings updated',
    entityType: 'Settings',
    entityId: 'pay_settings',
    metadata: { changed: sanitizeSettingsChanges(data) },
  });

  return updated;
}

/** Log only non-sensitive changed fields (never passwords, tokens, secrets). */
function sanitizeSettingsChanges(data: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set([
    'smtp', 'mailPassword', 'smtpPassword', 'apiSecret', 'webhookSecret',
    'secret', 'password', 'token',
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lower = key.toLowerCase();
    if (blocked.has(lower) || lower.includes('secret') || lower.includes('password') || lower.includes('token')) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

export async function getSystemSettings(): Promise<ISystemSettings> {
  const doc = await Settings.findOne({ key: 'system_settings', group: 'system' });
  if (!doc) {
    return DEFAULT_SYSTEM_SETTINGS;
  }
  return doc.value as ISystemSettings;
}

export async function updateSystemSettings(
  data: Partial<ISystemSettings>,
  userId?: string
): Promise<ISystemSettings> {
  const current = await getSystemSettings();
  const updated = { ...current, ...data };

  await Settings.findOneAndUpdate(
    { key: 'system_settings', group: 'system' },
    {
      key: 'system_settings',
      group: 'system',
      value: updated,
      updatedBy: userId,
    },
    { upsert: true, new: true }
  );

  await createActivityLog({
    userId,
    action: 'settings_updated',
    message: 'System settings updated',
    entityType: 'Settings',
    entityId: 'system_settings',
  });

  return updated;
}

export async function getSettingsByGroup(group: string) {
  const docs = await Settings.find({ group });
  const result: Record<string, unknown> = {};
  docs.forEach((doc) => {
    result[doc.key] = doc.value;
  });
  return result;
}
