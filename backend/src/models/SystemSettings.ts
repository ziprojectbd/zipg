import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  key: string;
  group: string;
  value: Record<string, unknown>;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    group: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema);

/* ──────── Default Values ──────── */

export const DEFAULT_SETTINGS: Record<string, Record<string, unknown>> = {
  general: {
    siteName: 'ZI Pay',
    siteUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    companyName: 'ZI Premium Services',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@zi-pay.local',
    supportPhone: '+8801XXXXXXXXX',
    defaultLanguage: 'en',
    timezone: 'Asia/Dhaka',
    currency: 'BDT',
    dateFormat: 'DD/MM/YYYY',
    logoUrl: '',
    faviconUrl: '',
  },
  gateway: {
    enabled: true,
    maintenanceMode: false,
    defaultPaymentExpiryMinutes: 15,
    minPaymentAmount: 1,
    maxPaymentAmount: 500000,
    duplicateTransactionProtection: true,
    autoVerify: true,
    autoExpirePendingOrders: true,
    autoExpireAfterMinutes: 30,
    defaultCurrency: 'BDT',
  },
  security: {
    jwtAccessTokenExpiry: '15m',
    jwtRefreshTokenExpiry: '7d',
    loginAttemptLimit: 5,
    loginBlockDurationMinutes: 15,
    passwordMinLength: 8,
    passwordRequireUppercase: false,
    passwordRequireNumber: true,
    passwordRequireSpecialChar: false,
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 5,
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean),
    apiRateLimitPerMinute: 120,
    authRateLimitPerMinute: 10,
    ipWhitelist: [] as string[],
    forceHttps: true,
  },
  sms: {
    /* General */
    enabled: true,
    paymentDetectionEnabled: true,
    autoVerifyPayment: true,
    autoMatchPendingOrders: true,
    autoCompletePayment: false,
    maintenanceMode: false,
    /* Providers */
    providers: {
      bkash: { enabled: true, accountNumber: '01XXXXXXXXX', accountType: 'Personal', senderIds: ['bKash'], priority: 1, displayName: 'bKash', logoUrl: '', status: 'active' },
      nagad: { enabled: true, accountNumber: '01XXXXXXXXX', accountType: 'Personal', senderIds: ['Nagad'], priority: 2, displayName: 'Nagad', logoUrl: '', status: 'active' },
      rocket: { enabled: true, accountNumber: '01XXXXXXXXX', accountType: 'Personal', senderIds: ['Rocket'], priority: 3, displayName: 'Rocket', logoUrl: '', status: 'active' },
    },
    /* SMS Validation */
    acceptOnlyRegisteredDevices: true,
    verifyDeviceApiKey: true,
    verifyDeviceId: true,
    verifyTimestamp: true,
    rejectDuplicateRequests: true,
    rejectInvalidProvider: true,
    rejectInvalidAmount: true,
    rejectOldSms: true,
    smsExpirationMinutes: 10,
    /* Payment Matching */
    matchingPriority: ['transactionId', 'amount', 'phoneNumber', 'provider', 'pendingOrder', 'timeWindow'],
    amountTolerance: 0,
    matchTimeWindowMinutes: 15,
    allowPartialMatch: false,
    /* Duplicate Protection */
    duplicateTransactionId: true,
    duplicateSmsHash: true,
    duplicateRequest: true,
    duplicateTimeWindowMinutes: 10,
    /* Device Communication */
    heartbeatIntervalSeconds: 30,
    offlineTimeoutSeconds: 120,
    minimumAppVersion: '1.0.0',
    forceAppUpdate: false,
    deviceApprovalRequired: true,
    /* Retry */
    retryCount: 3,
    retryDelaySeconds: 30,
    queueSize: 100,
    autoResend: false,
    /* Storage */
    saveRawSms: true,
    saveParsedSms: true,
    smsRetentionDays: 90,
    autoCleanup: true,
    /* Notifications */
    browserNotification: false,
    emailNotification: true,
    webhookNotification: true,
    notifyNewPayment: true,
    notifyFailedVerification: true,
    notifyDuplicateSms: false,
    notifyDeviceOffline: true,
    notifyApiError: true,
  },
  device: {
    maxDevicesPerMerchant: 10,
    requireDeviceApproval: true,
    heartbeatIntervalSeconds: 30,
    offlineTimeoutSeconds: 120,
    autoDisableOfflineDevice: true,
    minimumAppVersion: '1.0.0',
  },
  merchant: {
    allowRegistration: true,
    requireEmailVerification: true,
    requireManualApproval: false,
    defaultPlan: 'free',
    defaultTransactionLimit: 1000,
    defaultDeviceLimit: 5,
  },
  notification: {
    emailNotifications: true,
    browserNotifications: false,
    webhookNotifications: true,
    paymentSuccessNotify: true,
    paymentFailedNotify: true,
    offlineDeviceAlert: true,
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    encryption: 'tls',
    senderName: 'ZI Pay',
    senderEmail: process.env.SMTP_FROM || 'noreply@zi-pay.local',
  },
  api: {
    apiVersion: 'v1',
    enableApi: true,
  },
  analytics: {
    defaultDashboardRange: '30',
    enableRevenueCharts: true,
    enableExportCsv: true,
    enableExportExcel: false,
  },
  appearance: {
    theme: 'dark',
    primaryColor: '#8b5cf6',
    sidebarStyle: 'default',
    dashboardLayout: 'grid',
  },
};
