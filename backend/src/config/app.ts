const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const appConfig = {
  port: Number(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  // Public base URL of the API as seen from outside, behind the Coolify
  // reverse proxy. e.g. https://api.domain.com/api/v1
  baseUrl: process.env.BASE_URL || 'http://localhost:5001',
  // Frontend URL — used for CORS and cookie/redirect config.
  frontendUrl: FRONTEND_URL,

  jwt: {
    secret: process.env.JWT_SECRET || 'zipay-jwt-secret-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: 'zi-pay',
  },

  bcrypt: {
    saltRounds: 12,
  },

  rateLimit: {
    windowMs: 60 * 1000,
    max: 120,
    authMax: 10,
    apiMax: 60,
  },

  cors: {
    origin: (process.env.CORS_ORIGINS || 'https://pay.zipremiumservices.com,https://zipremiumservices.com,https://www.zipremiumservices.com')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },

  payment: {
    defaultExpiryMinutes: 15,
    /**
     * Secure invoice expiry in minutes. The server sets
     * `invoiceExpiresAt = invoiceCreatedAt + invoiceExpiryMinutes minutes`
     * and enforces it on every token-verified access.
     * Configurable via INVOICE_EXPIRY_MINUTES env var.
     */
    invoiceExpiryMinutes: Number(process.env.INVOICE_EXPIRY_MINUTES) || 15,
    maxAmount: 10000000,
    minAmount: 1,
    defaultCurrency: 'BDT',
  },

  webhook: {
    maxRetries: 3,
    retryDelayMs: 5000,
    timeout: 30000,
  },

  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },

  sms: {
    providers: ['bkash', 'nagad', 'rocket', 'upay'] as const,
    duplicateWindowMinutes: 10,
    amountTolerance: 0,
  },

  cache: {
    /** TTL for public pay-settings / provider config responses. */
    publicTtlSeconds: 60,
  },

  session: {
    maxConcurrentSessions: 5,
    inactivityTimeoutMs: 30 * 60 * 1000,
  },
} as const;

export type AppConfig = typeof appConfig;

/**
 * Validate required environment variables at startup.
 * Fails fast in production if critical vars are missing.
 */
export function validateEnv(): void {
  const requiredInProduction: string[] = ['JWT_SECRET', 'MONGODB_URI'];
  const missing: string[] = [];

  if (appConfig.isProduction) {
    for (const key of requiredInProduction) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`[zi-pay] ❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('[zi-pay] Set these in your Coolify environment variables or .env file.');
    // Do NOT process.exit(1) here — that makes the container crash-loop in
    // Coolify (Exited / restart limit reached). Instead the server stays up,
    // reports the problem via /health and retries the DB connection forever.
    console.warn('[zi-pay] ⚠️  Server will stay up but dependent features may not work until these are set.');
  }
}
