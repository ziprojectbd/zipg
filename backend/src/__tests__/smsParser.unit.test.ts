/**
 * SMS Parser service — unit tests
 *
 * Tests the server-side SMS parsing pipeline (parseSms, classifySmsCategory,
 * processIncomingSms, testParser, getParserRules) with mocked models and
 * settings so no MongoDB instance is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock heavy dependencies ─────────────────────────────────────────
const saveMock = vi.fn(async function () { return this; });

const smsDocTemplate = (overrides: Record<string, unknown> = {}) => ({
  _id: 'smsid001',
  deviceId: 'dev001',
  provider: 'bkash',
  sender: 'bKash',
  rawSms: '',
  parsedTxnId: null,
  parsedAmount: null,
  parsedPhone: null,
  category: 'unknown',
  parseConfidence: 0,
  status: 'parsed',
  matchedTransactionId: null,
  matchedPaymentRequestId: null,
  metadata: {},
  receivedAt: new Date(),
  save: saveMock,
  ...overrides,
});

vi.mock('../models/index.js', () => ({
  SmsTransaction: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findById: vi.fn(),
    aggregate: vi.fn(),
  },
  Transaction: {
    // Chainable, thenable query builder — emulates a real Mongoose query:
    // awaiting `findOne()` directly (Strategy 2) resolves to null, and.
    // `.sort().` (Strategy 1/3) also resolves to null by default.
    findOne: vi.fn(() => {
      const query = {
        sort: vi.fn().mockResolvedValue(null),
        then(resolve: (value: unknown) => void) {
          resolve(null);
        },
      };
      return query;
    }),
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
  PaymentRequest: {
    updateOne: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../services/activityLog.service.js', () => ({
  createActivityLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/systemSettings.service.js', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
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
  emitSmsTransaction: vi.fn(),
  emitManualVerification: vi.fn(),
}));

import {
  classifySmsCategory,
  parseSms,
  processIncomingSms,
  testParser,
  getParserRules,
  matchPendingTransaction,
} from '../services/smsParser.service.js';
import { SmsTransaction, Transaction } from '../models/index.js';
import { getSettings } from '../services/systemSettings.service.js';
import { emitSmsTransaction } from '../socket/index.js';
import { AppError } from '../middleware/errorHandler.js';

/* ────────── classifySmsCategory ────────── */

describe('classifySmsCategory', () => {
  it('classifies payment received (bKash credit SMS)', () => {
    const sms =
      'Your bKash account 01614602084 has been credited with BDT 1,000.00 from 01712345678. TrxID 9XH7F2V1K1.';
    expect(classifySmsCategory(sms, 'bkash')).toBe('payment_received');
  });

  it('classifies send money SMS', () => {
    const sms = 'You have sent 500.00 BDT to 01712345678 via Nagad. TrxID 12AB34CD';
    expect(classifySmsCategory(sms, 'nagad')).toBe('send_money');
  });

  it('classifies cash out SMS', () => {
    const sms = 'Your cash out of BDT 2,000.00 from agent 01712345678 is completed. TrxID CX9K21LM';
    expect(classifySmsCategory(sms, 'bkash')).toBe('cash_out');
  });

  it('classifies Benglish "টাকা পেয়েছেন" as received', () => {
    const sms = 'আপনি ১,০০০ টাকা পেয়েছেন। ট্রানজেকশন আইডি: 9XH7F2V1K1';
    expect(classifySmsCategory(sms, 'bkash')).toBe('payment_received');
  });

  it('returns unknown for unrelated SMS', () => {
    const sms = 'Your OTP for app login is 482913. Do not share it with anyone.';
    expect(classifySmsCategory(sms, 'unknown')).toBe('unknown');
  });
});

/* ────────── parseSms ────────── */

describe('parseSms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getSettings throws → parser falls back to default regex
    (getSettings as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no settings'));
  });

  it('parses a full bKash payment SMS', async () => {
    const sms =
      'Your bKash account is credited with BDT 1,000.00 from 01712345678. TrxID 9XH7F2V1K1.';
    const result = await parseSms(sms, 'bKash');

    expect(result.provider).toBe('bkash');
    expect(result.transactionId).toBe('9XH7F2V1K1');
    expect(result.amount).toBe(1000);
    expect(result.phone).toBe('01712345678');
    expect(result.category).toBe('payment_received');
    expect(result.confidence).toBe(1);
    expect(result.issues).toHaveLength(0);
  });

  it('parses Nagad amount with commas and different TXN format', async () => {
    const sms =
      'BDT 1,234.50 has been credited to your Nagad account by 01719876543. TrxID 12WERT987';
    const result = await parseSms(sms, 'Nagad');

    expect(result.provider).toBe('nagad');
    expect(result.transactionId).toBe('12WERT987');
    expect(result.amount).toBe(1234.5);
  });

  it('detects provider from SMS text even without a hint', async () => {
    const sms =
      'Rocket: You received BDT 300 from 01711223344. TrxID RK8765123';
    const result = await parseSms(sms, 'Rocket');
    expect(result.provider).toBe('rocket');
    expect(result.amount).toBe(300);
  });

  it('flags missing fields as issues and lowers confidence', async () => {
    const sms = 'Some random SMS with no payment data';
    const result = await parseSms(sms, 'unknown');

    expect(result.provider).toBe('unknown');
    expect(result.transactionId).toBeNull();
    expect(result.amount).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('uses provider hint over auto-detection', async () => {
    const sms =
      'Your bKash account is credited with BDT 500 from 01711112222. TrxID HINT123';
    const result = await parseSms(sms, 'unknown', 'nagad');
    // hint wins when provided even though text says bkash
    expect(result.provider).toBe('nagad');
  });
});

/* ────────── processIncomingSms ────────── */

describe('processIncomingSms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSettings as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no settings'));
  });

  it('auto-matches a pending transaction and marks it paid', async () => {
    const txnDoc = {
      _id: 'txn001',
      transactionId: 'TXN-001',
      provider: 'bkash',
      amount: 1000,
      status: 'pending',
      paymentRequestId: 'pr001',
      metadata: {},
      save: vi.fn(async function () { return this; }),
    };

    (SmsTransaction.create as ReturnType<typeof vi.fn>).mockResolvedValue(smsDocTemplate());
    (SmsTransaction.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null); // no duplicates
    (Transaction.findOne as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      sort: vi.fn().mockResolvedValue(txnDoc),
      then(resolve: (value: unknown) => void) { resolve(null); },
    }));

    const result = await processIncomingSms({
      deviceId: 'dev001',
      rawSms:
        'Your bKash account is credited with BDT 1,000.00 from 01712345678. TrxID 9XH7F2V1K1.',
      sender: 'bKash',
    });

    expect(result.matched).toBe(true);
    expect(result.transactionId).toBe('TXN-001');
    expect(result.status).toBe('matched');
    expect(txnDoc.status).toBe('paid');
    expect(txnDoc.customerTransactionId).toBe('9XH7F2V1K1');
    expect(txnDoc.verificationMethod).toBe('sms');
    expect(emitSmsTransaction).toHaveBeenCalled();
  });

  it('leaves SMS in parsed state when no pending transaction matches', async () => {
    (SmsTransaction.create as ReturnType<typeof vi.fn>).mockResolvedValue(smsDocTemplate());
    (SmsTransaction.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (Transaction.findOne as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      sort: vi.fn().mockResolvedValue(null),
      then(resolve: (value: unknown) => void) {
        resolve(null);
      },
    }));

    const result = await processIncomingSms({
      deviceId: 'dev001',
      rawSms:
        'Your bKash account is credited with BDT 5,500.00 from 01712345678. TrxID NOMATCH1.',
      sender: 'bKash',
    });

    expect(result.matched).toBe(false);
    expect(result.status).toBe('parsed');
    expect(result.transactionId).toBeNull();
  });

  it('rejects a duplicate transaction ID', async () => {
    const dup = smsDocTemplate({ status: 'verified' });
    (SmsTransaction.create as ReturnType<typeof vi.fn>).mockResolvedValue(smsDocTemplate());
    (SmsTransaction.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(dup);

    await expect(
      processIncomingSms({
        deviceId: 'dev001',
        rawSms:
          'Your bKash account is credited with BDT 800 from 01712345678. TrxID DUP999.',
        sender: 'bKash',
      })
    ).rejects.toThrow(AppError);
  });
});

/* ────────── matchPendingTransaction (rounded-amount matching) ────────── */

describe('matchPendingTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSettings as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no settings'));
  });

  function mockSortResolving(doc: unknown) {
    return (Transaction.findOne as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      sort: vi.fn().mockResolvedValue(doc),
      then(resolve: (value: unknown) => void) { resolve(doc); },
    }));
  }

  it('matches a stored 1000 against an SMS parsed amount of 1000.00 (rounded query)', async () => {
    const pending = { _id: 'txn1000', amount: 1000, status: 'pending' };
    mockSortResolving(pending);

    const result = await matchPendingTransaction({
      provider: 'bkash',
      transactionId: '9XH7F2V1K1',
      amount: 1000.0,
      phone: '01712345678',
      sender: 'bKash',
      category: 'payment_received',
      confidence: 1,
      issues: [],
      rawSms: 'Your bKash account is credited with BDT 1,000.00. TrxID 9XH7F2V1K1.',
    });

    expect(result).toBe(pending);
    const firstQuery = (Transaction.findOne as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstQuery.amount).toBe(1000); // rounded integer, not 1000.0/1000.00
  });

  it('queries the rounded amount for a float like 1000.5 (→ 1001, not 1000)', async () => {
    mockSortResolving(null);

    const result = await matchPendingTransaction({
      provider: 'bkash',
      transactionId: 'ABC123',
      amount: 1000.5,
      phone: '01712345678',
      sender: 'bKash',
      category: 'payment_received',
      confidence: 1,
      issues: [],
      rawSms: 'bKash BDT 1000.50. TrxID ABC123.',
    });

    expect(result).toBeNull();
    // First strategy query must use the ROUNDED amount (1001), never 1000.5
    const firstQuery = (Transaction.findOne as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstQuery.amount).toBe(1001);
  });

  it('returns null when parsed amount is missing', async () => {
    const result = await matchPendingTransaction({
      provider: 'bkash',
      transactionId: 'XYZ',
      amount: null,
      phone: null,
      sender: 'bKash',
      category: 'unknown',
      confidence: 0,
      issues: [],
      rawSms: 'no amount',
    });
    expect(result).toBeNull();
    expect(Transaction.findOne).not.toHaveBeenCalled();
  });
});

/* ────────── testParser ────────── */

describe('testParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSettings as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no settings'));
  });

  it('returns parse result plus issues for admin UI', async () => {
    const result = await testParser(
      'Your bKash account is credited with BDT 900 from 01712345678. TrxID TEST900.',
      'bkash'
    );

    expect(result.parsed.transactionId).toBe('TEST900');
    expect(result.parsed.amount).toBe(900);
    expect(result.issues).toBeDefined();
    expect(result.rawJson).toBeDefined();
  });
});

/* ────────── getParserRules ────────── */

describe('getParserRules', () => {
  it('returns defaults when settings are not available', async () => {
    (getSettings as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no settings'));
    const result = await getParserRules();

    expect(result.parserRules.bkash).toBeDefined();
    expect(result.parserRules.nagad).toBeDefined();
    expect(result.parserRules.rocket).toBeDefined();
    expect(typeof result.parserRules.bkash).toBe('string');
  });

  it('returns stored rules from settings when present', async () => {
    (getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      parserRules: {
        bkash: 'custom-bkash-pattern',
        nagad: 'custom-nagad-pattern',
        rocket: 'custom-rocket-pattern',
      },
    });
    const result = await getParserRules();

    expect(result.parserRules.bkash).toBe('custom-bkash-pattern');
    expect(result.parserRules.nagad).toBe('custom-nagad-pattern');
  });
});