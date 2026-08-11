/**
 * Invoice integration-level security tests
 *
 * Tests the service-layer security logic for:
 *   - verifyInvoiceAccess: 404 generic vs 410 expired vs 409 double-pay
 *   - markInvoicePaid: atomic race-condition / double-pay protection
 *   - Generic error message consistency (no information disclosure)
 *
 * These tests mock the DB layer but exercise the full service code paths.
 *
 * Run: pnpm test -- --run invoice.integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Mock setup ─────────────────────────────────────────────────────── */
// vi.hoisted ensures these fns exist BEFORE vi.mock factories run,
// avoiding TDZ ReferenceError when vi.mock factories reference them.
const { mockFindOne, mockFindOneAndUpdate } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockFindOneAndUpdate: vi.fn(),
}));

vi.mock('../models/index.js', () => ({
  PaymentRequest: {
    exists: vi.fn().mockResolvedValue(false),
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
    find: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    updateOne: vi.fn(),
    create: vi.fn(),
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
    _safe: boolean;
    constructor(message: string, status: number, code: string, safe?: boolean) {
      super(message);
      this.status = status;
      this.code = code;
      this._safe = safe ?? false;
    }
  },
}));

import {
  generateInvoiceAccessToken,
  hashInvoiceToken,
  verifyInvoiceAccess,
  markInvoicePaid,
  invoiceExpiryFromNow,
} from '../services/invoice.service.js';

/* ── Helpers ────────────────────────────────────────────────────────── */

function fakeInvoice(overrides: Record<string, any> = {}) {
  return {
    requestId: 'REQ-1700000000000-a1b2c3d4',
    publicInvoiceId: 'INV-ABCDEF1234',
    secureTokenHash: hashInvoiceToken(generateInvoiceAccessToken()),
    amount: 500,
    provider: 'bkash',
    currency: 'BDT',
    merchantName: 'Test Merchant',
    merchantAccount: '01614602084',
    orderId: 'ORD-001',
    status: 'pending',
    invoiceExpiresAt: invoiceExpiryFromNow(),
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Build a Mongoose-like query stub that supports .select() and .lean()
 * chaining, resolving to the given value.
 *
 * The service chains .select().lean() SYNCHRONOUSLY and awaits only at the
 * end, so .select() must return the stub itself (for chaining) and .lean()
 * must resolve to the value.
 *
 * Usage: mockFindOne.mockReturnValueOnce(makeQuery(invoice))
 */
function makeQuery(value: any) {
  const query = {
    select: vi.fn(),
    lean: vi.fn().mockResolvedValue(value),
  };
  (query.select as ReturnType<typeof vi.fn>).mockReturnValue(query);
  return query;
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe('verifyInvoiceAccess — security behavior', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 generic error for unknown invoiceId (no DB record)', async () => {
    mockFindOne.mockReturnValue(makeQuery(null));
    await expect(
      verifyInvoiceAccess('INV-NONEXIST', 'a'.repeat(64), {})
    ).rejects.toMatchObject({ status: 404, code: 'INVALID_INVOICE' });
  });

  it('returns 404 generic error when token hash does not match', async () => {
    const wrongToken = generateInvoiceAccessToken();
    const invoice = fakeInvoice({
      // DB stores a *different* token hash than the one provided
      secureTokenHash: hashInvoiceToken(generateInvoiceAccessToken()),
    });
    mockFindOne.mockReturnValue(makeQuery(invoice));
    await expect(
      verifyInvoiceAccess('INV-ABCDEF1234', wrongToken, {})
    ).rejects.toMatchObject({ status: 404, code: 'INVALID_TOKEN' });
  });

  it('returns 410 Gone for expired invoice', async () => {
    const token = generateInvoiceAccessToken();
    const invoice = fakeInvoice({
      secureTokenHash: hashInvoiceToken(token),
      invoiceExpiresAt: new Date(Date.now() - 60_000), // 1 minute ago
    });
    mockFindOne.mockReturnValue(makeQuery(invoice));
    await expect(
      verifyInvoiceAccess('INV-ABCDEF1234', token, {})
    ).rejects.toMatchObject({ status: 410, code: 'INVOICE_EXPIRED' });
  });

  // NOTE: verifyInvoiceAccess does NOT gate on status.
  // A paid invoice still returns full display data (the caller sees status:'paid').
  // One-time enforcement is write-side (markInvoicePaid uses atomic findOneAndUpdate).
  it('returns display data for an already-paid invoice (read-side is permissive)', async () => {
    const token = generateInvoiceAccessToken();
    const invoice = fakeInvoice({
      secureTokenHash: hashInvoiceToken(token),
      status: 'paid',
    });
    mockFindOne.mockReturnValue(makeQuery(invoice));
    const data = await verifyInvoiceAccess('INV-ABCDEF1234', token, {});
    expect(data).toHaveProperty('requestId');
    expect(data).toHaveProperty('amount');
    expect(data).toHaveProperty('provider');
    expect(data).toHaveProperty('status', 'paid');
    expect(data).not.toHaveProperty('secureTokenHash'); // never expose internal hash
  });

  it('returns full display data for valid, non-expired, pending invoice', async () => {
    const token = generateInvoiceAccessToken();
    const invoice = fakeInvoice({
      secureTokenHash: hashInvoiceToken(token),
      status: 'pending',
    });
    mockFindOne.mockReturnValue(makeQuery(invoice));
    const data = await verifyInvoiceAccess('INV-ABCDEF1234', token, {});
    expect(data).toHaveProperty('requestId');
    expect(data).toHaveProperty('amount');
    expect(data).toHaveProperty('provider');
    expect(data).toHaveProperty('status', 'pending');
    expect(data).not.toHaveProperty('secureTokenHash'); // never expose internal hash
  });
});

describe('verifyInvoiceAccess — generic error consistency', () => {
  beforeEach(() => vi.clearAllMocks());

  const cases = [
    { desc: 'unknown invoice', setup: () => mockFindOne.mockReturnValue(makeQuery(null)) },
    { desc: 'wrong token', setup: () => {
      mockFindOne.mockReturnValue(makeQuery(fakeInvoice({
        secureTokenHash: hashInvoiceToken(generateInvoiceAccessToken()),
      })));
    }},
  ];

  it.each(cases)('$desc → same generic message (no internal disclosure)', async ({ setup }) => {
    setup();
    const wrongToken = generateInvoiceAccessToken();
    try {
      await verifyInvoiceAccess('INV-ABCDEF1234', wrongToken, {});
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.message).toBe('This invoice link is invalid or has expired.');
      expect(err.status).toBe(404);
      // must NOT leak hash, DB fields, or internal code names in message
      expect(err.message).not.toContain('hash');
      expect(err.message).not.toContain('token');
      expect(err.message).not.toContain('internal');
    }
  });
});

describe('markInvoicePaid — atomic race / double-pay protection', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Set up the FIRST findOne call (consumed by verifyInvoiceAccess inside
   * markInvoicePaid) to return a valid pending invoice whose secureTokenHash
   * matches the provided token.
   */
  function mockValidInvoiceAccess(token: string, overrides: Record<string, any> = {}) {
    const invoice = fakeInvoice({
      secureTokenHash: hashInvoiceToken(token),
      status: 'pending',
      ...overrides,
    });
    // This findOne is consumed by verifyInvoiceAccess (the first call in markInvoicePaid)
    mockFindOne.mockReturnValueOnce(makeQuery(invoice));
  }

  it('returns paidResult when findOneAndUpdate succeeds (first payment)', async () => {
    const token = generateInvoiceAccessToken();
    mockValidInvoiceAccess(token);
    mockFindOneAndUpdate.mockResolvedValue({
      _id: 'abc',
      status: 'paid',
      publicInvoiceId: 'INV-ABCDEF1234',
      requestId: 'REQ-001',
      merchantName: 'Test',
      merchantAccount: '01614602084',
      orderId: 'ORD-001',
      amount: 500,
      currency: 'BDT',
      provider: 'bkash',
      invoiceExpiresAt: new Date(Date.now() + 300_000),
    });
    const result = await markInvoicePaid('INV-ABCDEF1234', token, { transactionId: 'TXN-001' });
    expect(result.status).toBe('paid');
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('throws 409 INVOICE_ALREADY_PAID when findOneAndUpdate returns null (race condition)', async () => {
    const token = generateInvoiceAccessToken();
    // 1st findOne → valid pending (for verifyInvoiceAccess)
    mockValidInvoiceAccess(token);
    // findOneAndUpdate returns null → concurrent request already paid it
    mockFindOneAndUpdate.mockResolvedValue(null);
    // 2nd findOne (diagnostic lookup after findOneAndUpdate failure) → status:'paid'
    mockFindOne.mockReturnValueOnce(makeQuery({
      publicInvoiceId: 'INV-ABCDEF1234',
      status: 'paid',
      invoiceExpiresAt: new Date(Date.now() + 60_000),
    }));
    await expect(
      markInvoicePaid('INV-ABCDEF1234', token, { transactionId: 'TXN-002' })
    ).rejects.toMatchObject({ status: 409, code: 'INVOICE_ALREADY_PAID' });
  });

  it('throws 410 when findOneAndUpdate returns null and invoice expired', async () => {
    const token = generateInvoiceAccessToken();
    // 1st findOne → valid pending (for verifyInvoiceAccess)
    mockValidInvoiceAccess(token);
    // findOneAndUpdate returns null (expiry guard blocked the update)
    mockFindOneAndUpdate.mockResolvedValue(null);
    // 2nd findOne (diagnostic lookup) → invoice is now expired
    mockFindOne.mockReturnValueOnce(makeQuery({
      publicInvoiceId: 'INV-ABCDEF1234',
      status: 'pending',
      invoiceExpiresAt: new Date(Date.now() - 60_000), // expired
    }));
    await expect(
      markInvoicePaid('INV-ABCDEF1234', token, {})
    ).rejects.toMatchObject({ status: 410, code: 'INVOICE_EXPIRED' });
  });

  it('throws 409 INVOICE_CANCELLED when invoice was cancelled', async () => {
    const token = generateInvoiceAccessToken();
    mockValidInvoiceAccess(token);
    mockFindOneAndUpdate.mockResolvedValue(null);
    mockFindOne.mockReturnValueOnce(makeQuery({
      publicInvoiceId: 'INV-ABCDEF1234',
      status: 'cancelled',
      invoiceExpiresAt: new Date(Date.now() + 60_000),
    }));
    await expect(
      markInvoicePaid('INV-ABCDEF1234', token, {})
    ).rejects.toMatchObject({ status: 409, code: 'INVOICE_CANCELLED' });
  });

  it('throws 409 INVOICE_CONFLICT for unexpected status', async () => {
    const token = generateInvoiceAccessToken();
    mockValidInvoiceAccess(token);
    mockFindOneAndUpdate.mockResolvedValue(null);
    mockFindOne.mockReturnValueOnce(makeQuery({
      publicInvoiceId: 'INV-ABCDEF1234',
      status: 'processing', // unexpected — neither paid, cancelled, nor expired
      invoiceExpiresAt: new Date(Date.now() + 60_000),
    }));
    await expect(
      markInvoicePaid('INV-ABCDEF1234', token, {})
    ).rejects.toMatchObject({ status: 409, code: 'INVOICE_CONFLICT' });
  });
});
