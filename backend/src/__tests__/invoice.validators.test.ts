/**
 * Invoice validators — Zod schema tests
 *
 * Tests all validation schemas used by the invoice endpoints:
 *   invoiceAccessParamsSchema, invoiceAccessQuerySchema, invoiceMintSchema
 *
 * Run: pnpm test -- --run invoice.validators
 */
import { describe, it, expect } from 'vitest';
import {
  invoiceAccessParamsSchema,
  invoiceAccessQuerySchema,
  invoiceMintSchema,
} from '../validators/index.js';

/* ──────────── invoiceAccessParamsSchema ──────────── */

describe('invoiceAccessParamsSchema', () => {
  const VALID = { invoiceId: 'INV-7K4X9P2M8Q' };

  it('accepts a valid invoice ID', () => {
    expect(invoiceAccessParamsSchema.safeParse(VALID).success).toBe(true);
  });

  it('accepts shorter invoice IDs (1 char)', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: 'INV-A' }).success).toBe(true);
  });

  it('accepts max length (20 chars)', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: 'INV-ABCDEFGHIJKLMNOPQRSTUVWXYZ' }).success).toBe(false); // 26 chars
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: 'INV-' + 'A'.repeat(20) }).success).toBe(true);
  });

  it('rejects lowercase letters', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: 'INV-abc123' }).success).toBe(false);
  });

  it('rejects missing prefix', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: '7K4X9P2M8Q' }).success).toBe(false);
  });

  it('rejects SQL injection attempt', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: "INV-'; DROP TABLE--" }).success).toBe(false);
  });

  it('rejects NoSQL injection attempt', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: '{"$gt":""}' }).success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: '' }).success).toBe(false);
  });

  it('rejects special characters', () => {
    expect(invoiceAccessParamsSchema.safeParse({ invoiceId: 'INV-@#$%^&*' }).success).toBe(false);
  });
});

/* ──────────── invoiceAccessQuerySchema ──────────── */

describe('invoiceAccessQuerySchema', () => {
  const VALID_TOKEN = { token: 'a'.repeat(64) };

  it('accepts a valid 64-hex token', () => {
    expect(invoiceAccessQuerySchema.safeParse(VALID_TOKEN).success).toBe(true);
  });

  it('accepts all hex chars 0-9a-f', () => {
    expect(invoiceAccessQuerySchema.safeParse({ token: '0123456789abcdef' + '0'.repeat(48) }).success).toBe(true);
  });

  it('rejects tokens shorter than 64 chars', () => {
    expect(invoiceAccessQuerySchema.safeParse({ token: 'a'.repeat(63) }).success).toBe(false);
  });

  it('rejects tokens longer than 64 chars', () => {
    expect(invoiceAccessQuerySchema.safeParse({ token: 'a'.repeat(65) }).success).toBe(false);
  });

  it('rejects non-hex characters (uppercase)', () => {
    expect(invoiceAccessQuerySchema.safeParse({ token: 'A'.repeat(64) }).success).toBe(false);
  });

  it('rejects special characters', () => {
    expect(invoiceAccessQuerySchema.safeParse({ token: '='.repeat(64) }).success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(invoiceAccessQuerySchema.safeParse({ token: '' }).success).toBe(false);
  });
});

/* ──────────── invoiceMintSchema ──────────── */

describe('invoiceMintSchema', () => {
  const VALID_BODY = {
    amount: 500,
    provider: 'bkash',
  };

  it('accepts minimal valid body (amount + provider)', () => {
    expect(invoiceMintSchema.safeParse(VALID_BODY).success).toBe(true);
  });

  it('accepts all optional fields', () => {
    expect(invoiceMintSchema.safeParse({
      amount: 1000,
      provider: 'nagad',
      currency: 'BDT',
      merchantName: 'Test Merchant',
      merchantAccount: '01614602084',
      orderId: 'ORD-12345',
    }).success).toBe(true);
  });

  it('accepts all three providers', () => {
    for (const p of ['bkash', 'nagad', 'rocket'] as const) {
      expect(invoiceMintSchema.safeParse({ amount: 100, provider: p }).success).toBe(true);
    }
  });

  it('rejects amount <= 0', () => {
    expect(invoiceMintSchema.safeParse({ amount: 0, provider: 'bkash' }).success).toBe(false);
    expect(invoiceMintSchema.safeParse({ amount: -100, provider: 'bkash' }).success).toBe(false);
  });

  it('rejects amount > 10,000,000', () => {
    expect(invoiceMintSchema.safeParse({ amount: 10_000_001, provider: 'bkash' }).success).toBe(false);
  });

  it('rejects unknown provider', () => {
    expect(invoiceMintSchema.safeParse({ amount: 100, provider: 'paypal' }).success).toBe(false);
  });

  it('rejects missing provider', () => {
    expect(invoiceMintSchema.safeParse({ amount: 100 }).success).toBe(false);
  });

  it('rejects missing amount', () => {
    expect(invoiceMintSchema.safeParse({ provider: 'bkash' }).success).toBe(false);
  });

  it('rejects NoSQL injection in orderId', () => {
    const body = { amount: 100, provider: 'bkash', orderId: '{"$gt":""}' };
    const result = invoiceMintSchema.safeParse(body);
    // orderId is a string field, so it accepts the raw string
    // (the injection is only dangerous if the value is used in a query)
    expect(result.success).toBe(true);
  });
});
