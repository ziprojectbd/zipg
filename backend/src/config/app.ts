export const appConfig = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

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
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },

  payment: {
    defaultExpiryMinutes: 15,
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
    providers: ['bkash', 'nagad', 'rocket'] as const,
    duplicateWindowMinutes: 10,
    amountTolerance: 0,
  },

  session: {
    maxConcurrentSessions: 5,
    inactivityTimeoutMs: 30 * 60 * 1000,
  },
} as const;

export type AppConfig = typeof appConfig;
