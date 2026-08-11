import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT',
  },
});

/**
 * Invoice creation limit — bounds the number of one-time invoices a client
 * can mint (prevents mass invoice generation / resource abuse).
 */
export const invoiceCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many invoice requests, please try again later',
    code: 'INVOICE_CREATE_RATE_LIMIT',
  },
});

/**
 * Invoice access / token verification limit — halts token brute-force and
 * invoice-ID enumeration. Generic body identical to the global one so an
 * attacker cannot distinguish rate-limit events from real responses.
 */
export const invoiceAccessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT',
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
    code: 'AUTH_RATE_LIMIT',
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API rate limit exceeded',
    code: 'API_RATE_LIMIT',
  },
});

export const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'SMS rate limit exceeded',
    code: 'SMS_RATE_LIMIT',
  },
});
