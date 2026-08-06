import { z } from 'zod';

/* ────────── Settings schemas per group ────────── */
export const updateGeneralSettingsSchema = z.object({
  siteName: z.string().min(1).max(200).optional(),
  siteUrl: z.string().max(500).optional(),
  companyName: z.string().min(1).max(200).optional(),
  supportEmail: z.string().email().max(200).optional(),
  supportPhone: z.string().max(20).optional(),
  defaultLanguage: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
  dateFormat: z.string().max(20).optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
});

export const updateGatewaySettingsSchema = z.object({
  enabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  defaultPaymentExpiryMinutes: z.number().min(1).max(1440).optional(),
  minPaymentAmount: z.number().positive().optional(),
  maxPaymentAmount: z.number().positive().optional(),
  duplicateTransactionProtection: z.boolean().optional(),
  autoVerify: z.boolean().optional(),
  autoExpirePendingOrders: z.boolean().optional(),
  autoExpireAfterMinutes: z.number().min(1).max(1440).optional(),
  defaultProvider: z.enum(['bkash', 'nagad', 'rocket']).optional(),
  defaultCurrency: z.string().length(3).optional(),
});

export const updateSecuritySettingsSchema = z.object({
  jwtAccessTokenExpiry: z.string().max(10).optional(),
  jwtRefreshTokenExpiry: z.string().max(10).optional(),
  loginAttemptLimit: z.number().min(1).max(100).optional(),
  loginBlockDurationMinutes: z.number().min(1).max(1440).optional(),
  passwordMinLength: z.number().min(6).max(64).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSpecialChar: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().min(1).max(1440).optional(),
  maxConcurrentSessions: z.number().min(1).max(100).optional(),
  corsOrigins: z.array(z.string()).optional(),
  apiRateLimitPerMinute: z.number().min(1).optional(),
  authRateLimitPerMinute: z.number().min(1).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  forceHttps: z.boolean().optional(),
});

export const updateSmsSettingsSchema = z.object({
  /* General */
  enabled: z.boolean().optional(),
  paymentDetectionEnabled: z.boolean().optional(),
  autoVerifyPayment: z.boolean().optional(),
  autoMatchPendingOrders: z.boolean().optional(),
  autoCompletePayment: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  /* Providers (object with bkash/nagad/rocket) */
  providers: z.object({
    bkash: z.object({
      enabled: z.boolean(), accountNumber: z.string(), accountType: z.string(),
      senderIds: z.array(z.string()), priority: z.number(), displayName: z.string(),
      logoUrl: z.string(), status: z.string(),
    }).partial().optional(),
    nagad: z.object({
      enabled: z.boolean(), accountNumber: z.string(), accountType: z.string(),
      senderIds: z.array(z.string()), priority: z.number(), displayName: z.string(),
      logoUrl: z.string(), status: z.string(),
    }).partial().optional(),
    rocket: z.object({
      enabled: z.boolean(), accountNumber: z.string(), accountType: z.string(),
      senderIds: z.array(z.string()), priority: z.number(), displayName: z.string(),
      logoUrl: z.string(), status: z.string(),
    }).partial().optional(),
  }).partial().optional(),
  /* SMS Validation */
  acceptOnlyRegisteredDevices: z.boolean().optional(),
  verifyDeviceApiKey: z.boolean().optional(),
  verifyDeviceId: z.boolean().optional(),
  verifyTimestamp: z.boolean().optional(),
  rejectDuplicateRequests: z.boolean().optional(),
  rejectInvalidProvider: z.boolean().optional(),
  rejectInvalidAmount: z.boolean().optional(),
  rejectOldSms: z.boolean().optional(),
  smsExpirationMinutes: z.number().min(1).max(1440).optional(),
  /* Payment Matching */
  matchingPriority: z.array(z.string()).optional(),
  amountTolerance: z.number().min(0).optional(),
  matchTimeWindowMinutes: z.number().min(1).max(1440).optional(),
  allowPartialMatch: z.boolean().optional(),
  /* Duplicate Protection */
  duplicateTransactionId: z.boolean().optional(),
  duplicateSmsHash: z.boolean().optional(),
  duplicateRequest: z.boolean().optional(),
  duplicateTimeWindowMinutes: z.number().min(1).max(1440).optional(),
  /* Device Communication */
  heartbeatIntervalSeconds: z.number().min(5).optional(),
  offlineTimeoutSeconds: z.number().min(10).optional(),
  minimumAppVersion: z.string().optional(),
  forceAppUpdate: z.boolean().optional(),
  deviceApprovalRequired: z.boolean().optional(),
  /* Retry */
  retryCount: z.number().min(0).max(10).optional(),
  retryDelaySeconds: z.number().min(1).optional(),
  queueSize: z.number().min(1).optional(),
  autoResend: z.boolean().optional(),
  /* Storage */
  saveRawSms: z.boolean().optional(),
  saveParsedSms: z.boolean().optional(),
  smsRetentionDays: z.number().min(1).max(365).optional(),
  autoCleanup: z.boolean().optional(),
  /* Notifications */
  browserNotification: z.boolean().optional(),
  emailNotification: z.boolean().optional(),
  webhookNotification: z.boolean().optional(),
  notifyNewPayment: z.boolean().optional(),
  notifyFailedVerification: z.boolean().optional(),
  notifyDuplicateSms: z.boolean().optional(),
  notifyDeviceOffline: z.boolean().optional(),
  notifyApiError: z.boolean().optional(),
});

export const updateDeviceSettingsSchema = z.object({
  maxDevicesPerMerchant: z.number().min(1).optional(),
  requireDeviceApproval: z.boolean().optional(),
  heartbeatIntervalSeconds: z.number().min(5).optional(),
  offlineTimeoutSeconds: z.number().min(10).optional(),
  autoDisableOfflineDevice: z.boolean().optional(),
  minimumAppVersion: z.string().optional(),
});

export const updateMerchantSettingsSchema = z.object({
  allowRegistration: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  requireManualApproval: z.boolean().optional(),
  defaultPlan: z.string().optional(),
  defaultTransactionLimit: z.number().min(0).optional(),
  defaultDeviceLimit: z.number().min(0).optional(),
});

export const updateNotificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  browserNotifications: z.boolean().optional(),
  webhookNotifications: z.boolean().optional(),
  paymentSuccessNotify: z.boolean().optional(),
  paymentFailedNotify: z.boolean().optional(),
  offlineDeviceAlert: z.boolean().optional(),
});

export const updateEmailSettingsSchema = z.object({
  smtpHost: z.string().max(200).optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUsername: z.string().max(200).optional(),
  smtpPassword: z.string().max(200).optional(),
  encryption: z.enum(['none', 'ssl', 'tls']).optional(),
  senderName: z.string().max(100).optional(),
  senderEmail: z.string().email().max(200).optional(),
});

export const updateApiSettingsSchema = z.object({
  apiVersion: z.string().max(10).optional(),
  enableApi: z.boolean().optional(),
});

export const updateAppearanceSettingsSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  primaryColor: z.string().max(30).optional(),
  sidebarStyle: z.string().max(20).optional(),
  dashboardLayout: z.string().max(20).optional(),
});

export const updateAnalyticsSettingsSchema = z.object({
  defaultDashboardRange: z.string().optional(),
  enableRevenueCharts: z.boolean().optional(),
  enableExportCsv: z.boolean().optional(),
  enableExportExcel: z.boolean().optional(),
});

export const testEmailSchema = z.object({
  to: z.string().email(),
});
