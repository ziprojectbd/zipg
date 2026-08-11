import crypto from 'node:crypto';

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix: string = '', length: number = 8): string {
  const random = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
  return prefix ? `${prefix}-${random}` : random;
}

/**
 * Generate a transaction ID
 */
export function generateTransactionId(): string {
  return `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Generate a request ID
 */
export function generateRequestId(): string {
  return `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Create a SHA-256 HMAC signature
 */
export function createSignature(secret: string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify a webhook signature
 */
export function verifySignature(
  signature: string,
  secret: string,
  timestamp: string,
  body: string
): boolean {
  const expected = createSignature(secret, `${timestamp}${body}`);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Sanitize a string for safe output
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * Mask a phone number (show last 3 digits)
 */
export function maskPhone(phone: string): string {
  if (phone.length < 4) return '***';
  return `***${phone.slice(-3)}`;
}

/**
 * Format amount to display
 */
export function formatAmount(amount: number, currency: string = 'BDT'): string {
  return `${amount.toLocaleString('en-BD')} ${currency}`;
}

/**
 * Calculate success rate
 */
export function calculateSuccessRate(success: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((success / total) * 1000) / 10;
}

/**
 * Safely parse JSON
 */
export function safeJsonParse<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export { migrateLegacyInvoices } from './migrateLegacyInvoices.js';

/**
 * Get pagination meta
 */
export function getPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}
