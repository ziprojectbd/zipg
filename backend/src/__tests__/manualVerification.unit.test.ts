/**
 * Manual Verification service — unit tests
 *
 * Tests verifyTransaction, rejectTransaction, and getPendingVerifications
 * with fully mocked models so no MongoDB instance is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const saveMock = vi.fn(async function () { return this; });

function makeSmsDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'sms001',
    status: 'parsed',
    provider: 'bkash',
    parsedTxnId: 'TRX001',
    parsedAmount: 500,
    parsedPhone: '01712345678',
    matchedTransactionId: null,
    matchedPaymentRequestId: null,
    deviceId: 'dev001',
    rawSms: 'Your bKash account is credited with BDT 500 from 01712345678. TrxID TRX001',
    sender: 'bKash',
    receivedAt: new Date(),
    save: saveMock,
    ...overrides,
  };
}

function makeTxnDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'txn001',
    transactionId: 'TXN-001',
    provider: 'bkash',
    amount: 500,
    status: 'pending',
    paymentRequestId: 'pr001',
    metadata: {},
    save: vi.fn(async function () { return this; }),
    ...overrides,
  };
}

// ── Mock heavy dependencies ─────────────────────────────────────────

vi.mock('../models/index.js', () => ({
  SmsTransaction: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findById: vi.fn(),
  },
  Transaction: {
    // Chainable query builder — service calls `.sort()` on findOne results
    findOne: vi.fn(() => ({ sort: vi.fn().mockResolvedValue(null) })),
    findById: vi.fn(),
  },
  PaymentRequest: {
    updateOne: vi.fn(),
  },
}));

vi.mock('../services/activityLog.service.js', () => ({
  createActivityLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../middleware/errorHandler.js', () => ({
  AppError: class AppError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock('../socket/index.js', () => ({
  emitManualVerification: vi.fn(),
}));

import {
  verifyTransaction,
  rejectTransaction,
  getPendingVerifications,
} from '../services/manualVerification.service.js';
import { SmsTransaction, Transaction, PaymentRequest } from '../models/index.js';
import { emitManualVerification } from '../socket/index.js';
import { AppError } from '../middleware/errorHandler.js';

/* ────────── verifyTransaction ────────── */

describe('verifyTransaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('manually verifies an SMS and marks linked Transaction as paid', async () => {
    const smsDoc = makeSmsDoc();
    const txnDoc = makeTxnDoc();

    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(smsDoc);
    (Transaction.findOne as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      sort: vi.fn().mockResolvedValue(txnDoc),
    }));

    const result = await verifyTransaction('sms001', 'admin001', 'Looks legit');

    expect(result.status).toBe('verified');
    expect(result.matchedTransactionId).toBe('TXN-001');
    expect(smsDoc.status).toBe('verified');
    expect(smsDoc.verificationMethod).toBe('manual');
    expect(smsDoc.verifiedBy).toBe('admin001');
    expect(txnDoc.status).toBe('paid');
    expect(txnDoc.verificationMethod).toBe('manual');
    expect(emitManualVerification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'verified' })
    );
  });

  it('works even when no pending transaction matches', async () => {
    const smsDoc = makeSmsDoc();
    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(smsDoc);
    (Transaction.findOne as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      sort: vi.fn().mockResolvedValue(null),
    }));

    const result = await verifyTransaction('sms001', 'admin001');

    expect(result.status).toBe('verified');
    expect(result.matchedTransactionId).toBeNull();
    expect(smsDoc.status).toBe('verified');
    expect(smsDoc.verifiedAt).toBeDefined();
  });

  it('throws if SMS not found', async () => {
    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(verifyTransaction('nonexistent', 'admin001')).rejects.toThrow(AppError);
  });

  it('throws if already verified', async () => {
    const smsDoc = makeSmsDoc({ status: 'verified' });
    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(smsDoc);

    await expect(verifyTransaction('sms001', 'admin001')).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('already verified') })
    );
  });

  it('throws if rejected', async () => {
    const smsDoc = makeSmsDoc({ status: 'rejected' });
    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(smsDoc);

    await expect(verifyTransaction('sms001', 'admin001')).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('Cannot verify') })
    );
  });
});

/* ────────── rejectTransaction ────────── */

describe('rejectTransaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an SMS and logs the reason', async () => {
    const smsDoc = makeSmsDoc();
    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(smsDoc);

    const result = await rejectTransaction('sms001', 'admin001', 'Suspicious sender');

    expect(result.status).toBe('rejected');
    expect(result.reason).toBe('Suspicious sender');
    expect(smsDoc.status).toBe('rejected');
    expect(smsDoc.verificationNotes).toBe('Suspicious sender');
    expect(smsDoc.verifiedBy).toBe('admin001');
    expect(emitManualVerification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rejected' })
    );
  });

  it('throws if already verified', async () => {
    const smsDoc = makeSmsDoc({ status: 'verified' });
    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(smsDoc);

    await expect(rejectTransaction('sms001', 'admin001', 'reason')).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('Cannot reject') })
    );
  });

  it('throws if SMS not found', async () => {
    (SmsTransaction.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(rejectTransaction('nonexistent', 'admin001', 'reason')).rejects.toThrow(AppError);
  });
});

/* ────────── getPendingVerifications ────────── */

describe('getPendingVerifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated results', async () => {
    (SmsTransaction.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([makeSmsDoc(), makeSmsDoc()]),
    });
    (SmsTransaction.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const result = await getPendingVerifications({ page: 1, limit: 20 });

    expect(result.verifications).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.page).toBe(1);
  });

  it('defaults to page 1', async () => {
    (SmsTransaction.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    (SmsTransaction.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const result = await getPendingVerifications();
    expect(result.pagination.page).toBe(1);
  });
});