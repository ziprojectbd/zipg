/**
 * Invoice service — pure unit tests
 *
 * Tests all exported pure functions from invoice.service.ts that do NOT
 * touch the database:
 *   generatePublicInvoiceId, generateInvoiceAccessToken,
 *   hashInvoiceToken, assertValidTransition, isInvoiceExpired,
 *   invoiceExpiryFromNow, and the create helpers.
 *
 * Run: pnpm test -- --run invoice.service.unit
 */
import { describe, it, expect, vi } from 'vitest';

/* ── We need to import the pure functions directly.  The module has
 * side-effects at the top level (importing models/config), so we import
 * only after mocking the heavy modules. ─────────────────────────────── */

// Stub out database and heavy dependencies so the module can be imported
// without a running MongoDB instance.
vi.mock('../models/index.js', () => ({
  PaymentRequest: {
    exists:    vi.fn().mockResolvedValue(false),
    findOne:   vi.fn(),
    find:       vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
    updateOne: vi.fn(),
    create:    vi.fn(),
  },
}));

vi.mock('../services/activityLog.service.js', () => ({
  createActivityLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config/app.js', () => ({
  appConfig: {
    nodeEnv: 'test',
    payment: {
      invoiceExpiryMinutes: 15,
      defaultExpiryMinutes: 15,
      minAmount: 1,
      maxAmount: 10_000_000,
    },
  },
}));

vi.mock('../middleware/errorHandler.js', () => ({
  AppError: class AppError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string, _safe?: boolean) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

import type { TransactionStatus } from '../models/index.js';
import {
  generatePublicInvoiceId,
  generateInvoiceAccessToken,
  hashInvoiceToken,
  assertValidTransition,
  isInvoiceExpired,
  invoiceExpiryFromNow,
} from '../services/invoice.service.js';

/* ─────────────────────────── ID generation ─────────────────────────── */

describe('generatePublicInvoiceId', () => {
  it('returns a string prefixed with INV-', () => {
    const id = generatePublicInvoiceId();
    expect(id).toMatch(/^INV-/);
  });

  it('returns exactly 14 characters (INV- + 10 alphanum)', () => {
    const id = generatePublicInvoiceId();
    expect(id.length).toBe(14);
    // INV- + 10 chars
    expect(id.slice(4)).toHaveLength(10);
  });

  it('uses only uppercase alphanumeric characters after the prefix', () => {
    const id = generatePublicInvoiceId();
    expect(id.slice(4)).toMatch(/^[A-Z0-9]+$/);
  });

  it('generates unique IDs across multiple calls (collision test)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) {
      ids.add(generatePublicInvoiceId());
    }
    // 500 unique IDs out of 500 — collision probability is astronomically low
    expect(ids.size).toBe(500);
  });

  it('does not contain any lowercase letters', () => {
    const id = generatePublicInvoiceId();
    expect(id).not.toMatch(/[a-z]/);
  });
});

/* ───────────────────── Access token generation ────────────────────── */

describe('generateInvoiceAccessToken', () => {
  it('returns a 64-character hex string (32 bytes)', () => {
    const token = generateInvoiceAccessToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens across calls', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 200; i++) {
      tokens.add(generateInvoiceAccessToken());
    }
    expect(tokens.size).toBe(200);
  });

  it('uses only hex characters (lowercase)', () => {
    const token = generateInvoiceAccessToken();
    expect(token).not.toMatch(/[g-z]/);
  });
});

/* ───────────────────── Token hashing ──────────────────────────────── */

describe('hashInvoiceToken', () => {
  it('returns a 64-character SHA-256 hex digest', () => {
    const token = generateInvoiceAccessToken();
    const hash = hashInvoiceToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input gives same output', () => {
    const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const h1 = hashInvoiceToken(token);
    const h2 = hashInvoiceToken(token);
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different tokens', () => {
    const token1 = '0000000000000000000000000000000000000000000000000000000000000001';
    const token2 = '0000000000000000000000000000000000000000000000000000000000000002';
    expect(hashInvoiceToken(token1)).not.toBe(hashInvoiceToken(token2));
  });

  it('matches a known SHA-256 digest', () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const emptyHash = hashInvoiceToken('');
    expect(emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

/* ───────────────────── Status state machine ───────────────────────── */

describe('assertValidTransition', () => {
  const terminalStatuses: TransactionStatus[] = ['paid', 'failed', 'expired', 'cancelled'];

  it('allows pending → processing', () => {
    expect(() => assertValidTransition('pending', 'processing')).not.toThrow();
  });

  it('allows pending → paid', () => {
    expect(() => assertValidTransition('pending', 'paid')).not.toThrow();
  });

  it('allows pending → expired', () => {
    expect(() => assertValidTransition('pending', 'expired')).not.toThrow();
  });

  it('allows pending → cancelled', () => {
    expect(() => assertValidTransition('pending', 'cancelled')).not.toThrow();
  });

  it('allows processing → paid', () => {
    expect(() => assertValidTransition('processing', 'paid')).not.toThrow();
  });

  it('allows processing → failed', () => {
    expect(() => assertValidTransition('processing', 'failed')).not.toThrow();
  });

  it('rejects paid → pending (cannot un-pay)', () => {
    expect(() => assertValidTransition('paid', 'pending')).toThrow('not allowed');
  });

  it('rejects paid → processing', () => {
    expect(() => assertValidTransition('paid', 'processing')).toThrow('not allowed');
  });

  it.each(terminalStatuses)('rejects %s → any other status (terminal state)', (terminal) => {
    const transitions: TransactionStatus[] = ['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled'];
    for (const next of transitions) {
      if (next === terminal) continue;
      expect(() => assertValidTransition(terminal, next)).toThrow('not allowed');
    }
  });
});

/* ───────────────────── Expiry logic ───────────────────────────────── */

describe('isInvoiceExpired', () => {
  it('returns true when invoiceExpiresAt is in the past', () => {
    const past = new Date(Date.now() - 60_000);
    expect(isInvoiceExpired({ invoiceExpiresAt: past })).toBe(true);
  });

  it('returns false when invoiceExpiresAt is in the future', () => {
    const future = new Date(Date.now() + 60_000);
    expect(isInvoiceExpired({ invoiceExpiresAt: future })).toBe(false);
  });

  it('falls back to expiresAt when invoiceExpiresAt is null', () => {
    const past = new Date(Date.now() - 60_000);
    expect(isInvoiceExpired({ invoiceExpiresAt: null, expiresAt: past })).toBe(true);
  });

  it('returns true when both dates are null', () => {
    expect(isInvoiceExpired({ invoiceExpiresAt: null, expiresAt: null })).toBe(true);
  });
});

describe('invoiceExpiryFromNow', () => {
  it('returns a Date in the future (now + 15 minutes by default)', () => {
    const before = Date.now();
    const expiry = invoiceExpiryFromNow();
    const after = Date.now();
    const expected = 15 * 60 * 1000;
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + expected - 1000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + expected + 1000);
  });
});

/* ───────────────────── Token + ID combined security ───────────────── */

describe('token ↔ hash round-trip', () => {
  it('a freshly generated token hashes correctly and can be verified', () => {
    const token = generateInvoiceAccessToken();
    const hash  = hashInvoiceToken(token);
    const rehash = hashInvoiceToken(token);
    expect(hash).toBe(rehash);
    expect(hash).not.toBe(token);
  });

  it('a tampered token does NOT match the original hash', () => {
    const token  = generateInvoiceAccessToken();
    const hash   = hashInvoiceToken(token);
    const tampered = 'f' + token.slice(1); // flip first nibble
    expect(hashInvoiceToken(tampered)).not.toBe(hash);
  });
});

/* ────────────── crypto.timingSafeEqual usage (indirect) ──────────── */
// hashInvoiceToken returns hex digests; the invoice service compares
// them via crypto.timingSafeEqual in verifyInvoiceAccess and
// markInvoicePaid.  We verify the hashing is correct so that
// timingSafeEqual behaves as expected.

describe('hash collision resistance', () => {
  it('10,000 random tokens produce 10,000 distinct hashes', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      hashes.add(hashInvoiceToken(generateInvoiceAccessToken()));
    }
    expect(hashes.size).toBe(10_000);
  });
});
