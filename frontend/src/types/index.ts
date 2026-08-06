export type PaymentProvider = 'bkash' | 'nagad' | 'rocket';
export type TransactionStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'expired' | 'cancelled';
export type UserRole = 'super_admin' | 'admin' | 'operator';
export type DeviceStatus = 'online' | 'offline';
export type WebhookEvent =
  | 'payment.created'
  | 'payment.paid'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.cancelled'
  | 'payment.verified';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  status: TransactionStatus;
  merchantId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PaymentRequest {
  _id: string;
  requestId: string;
  merchantId?: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  customerName: string;
  customerPhone: string;
  status: TransactionStatus;
  expiresAt: string;
  createdAt: string;
}

export interface Device {
  _id: string;
  deviceId: string;
  name: string;
  status: DeviceStatus;
  provider: PaymentProvider;
  phoneNumber: string;
  batteryLevel?: number;
  networkType?: string;
  androidVersion?: string;
  appVersion?: string;
  isEnabled: boolean;
  isApproved: boolean;
  lastSyncAt?: string;
  totalSmsProcessed: number;
  totalPaymentsMatched: number;
}

export interface ApiKey {
  _id: string;
  key: string;
  name: string;
  merchantId: string;
  merchantName: string;
  isActive: boolean;
  isRevoked: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  ipWhitelist: string[];
  permissions: string[];
  createdAt: string;
}

export interface WebhookConfig {
  _id: string;
  webhookId: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  retryCount: number;
  maxRetries: number;
  lastDeliveryAt?: string;
  lastStatus?: string;
  totalDeliveries: number;
  totalFailures: number;
}

export interface WebhookDelivery {
  _id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  responseCode?: number;
  attemptCount: number;
  errorMessage?: string;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  userId?: { _id: string; name: string; email: string };
  action: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaySettings {
  title: string;
  subtitle: string;
  description: string;
  enabledProviders: PaymentProvider[];
  merchantBkashNumber: string;
  merchantNagadNumber: string;
  merchantRocketNumber: string;
  instructions: {
    bkash: string;
    nagad: string;
    rocket: string;
  };
  showBranding: boolean;
  primaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export interface SystemSettings {
  siteName: string;
  siteUrl: string;
  defaultCurrency: string;
  paymentExpiryMinutes: number;
  maxPaymentAmount: number;
  minPaymentAmount: number;
  enablePublicPayments: boolean;
  webhookRetryMax: number;
  webhookRetryDelayMs: number;
  maintenanceMode: boolean;
}

export interface DashboardOverview {
  metrics: {
    todayRevenue: number;
    todayTransactions: number;
    weekRevenue: number;
    monthRevenue: number;
    pendingCount: number;
    successCount: number;
    failedCount: number;
    totalRevenue: number;
    totalTransactions: number;
    averagePayment: number;
  };
  providerBreakdown: Array<{
    name: string;
    revenue: number;
    count: number;
    percentage: number;
  }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaymentMethod {
  _id: string;
  code: PaymentProvider;
  name: string;
  displayName: string;
  isActive: boolean;
  minAmount: number;
  maxAmount: number;
  processingFee: number;
  processingFeeType: 'fixed' | 'percentage';
  accountNumber: string;
  instructions: string;
  sortOrder: number;
}

export interface CreatePaymentInput {
  amount: number;
  provider: PaymentProvider;
  customerName: string;
  customerPhone: string;
  trxId: string;
  currency?: string;
  description?: string;
}

export interface CreatePaymentResponse {
  requestId: string;
  transactionId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: string;
  expiresAt: string;
}
