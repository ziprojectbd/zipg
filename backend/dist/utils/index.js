import crypto from 'node:crypto';
/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix = '', length = 8) {
    const random = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
    return prefix ? `${prefix}-${random}` : random;
}
/**
 * Generate a transaction ID
 */
export function generateTransactionId() {
    return `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
/**
 * Generate a request ID
 */
export function generateRequestId() {
    return `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
/**
 * Create a SHA-256 HMAC signature
 */
export function createSignature(secret, data) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}
/**
 * Verify a webhook signature
 */
export function verifySignature(signature, secret, timestamp, body) {
    const expected = createSignature(secret, `${timestamp}${body}`);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
/**
 * Sanitize a string for safe output
 */
export function sanitizeHtml(input) {
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
export function maskPhone(phone) {
    if (phone.length < 4)
        return '***';
    return `***${phone.slice(-3)}`;
}
/**
 * Format amount to display
 */
export function formatAmount(amount, currency = 'BDT') {
    return `${amount.toLocaleString('en-BD')} ${currency}`;
}
/**
 * Calculate success rate
 */
export function calculateSuccessRate(success, total) {
    if (total === 0)
        return 0;
    return Math.round((success / total) * 1000) / 10;
}
/**
 * Safely parse JSON
 */
export function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
/**
 * Get pagination meta
 */
export function getPaginationMeta(page, limit, total) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
    };
}
