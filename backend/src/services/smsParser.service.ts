import { SmsTransaction, Transaction, type PaymentProvider } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
import { getSettings } from './systemSettings.service.js';
import { emitSmsTransaction } from '../socket/index.js';

/* ────────── Types ────────── */

export type SmsCategory = 'payment_received' | 'send_money' | 'cash_out' | 'unknown';

export interface ParsedSmsResult {
  provider: PaymentProvider | 'unknown';
  transactionId: string | null;
  amount: number | null;
  phone: string | null;
  sender: string;
  category: SmsCategory;
  confidence: number;
  issues: string[];
  rawSms: string;
}

export interface ProcessSmsInput {
  deviceId: string;
  rawSms: string;
  sender: string;
  provider?: string;
  receivedAt?: string;
}

/* ────────── Default regex patterns per provider ────────── */

// Captures transaction ID (group 1). Amount/phone are extracted independently to
// avoid assuming field ordering (real bKash/Nagad SMS put the amount BEFORE the TrxID).
const DEFAULT_PARSER_RULES: Record<string, string> = {
  bkash:
    '(?:bKash|বিকাশ).*?(?:TXN|TrxID|Transaction\\s*ID|ট্রানজেকশন আইডি|ট্রাঞ্জেকশন আইডি)[:\\s]*([A-Z0-9]+)',
  nagad: '(?:Nagad|নগদ).*?(?:TXN|TrxID|Transaction\\s*ID)[:\\s]*([A-Z0-9]+)',
  rocket: '(?:Rocket|রকেট).*?(?:TXN|TrxID|Transaction\\s*ID)[:\\s]*([A-Z0-9]+)',
};

const PHONE_REGEX = /01\d{9}/;
const AMOUNT_REGEX = /(?:BDT|Tk|টাকা|TK)[:\s]*([\d,]+(?:\.\d+)?)/i;
const SENDER_KW: Record<string, string[]> = {
  bkash: ['bKash', 'বিকাশ'],
  nagad: ['Nagad', 'নগদ'],
  rocket: ['Rocket', 'রকেট'],
};

/* ────────── Helpers ────────── */

async function loadParserRegex(): Promise<Record<string, RegExp>> {
  try {
    const smsSettings = (await getSettings('sms')) as Record<string, unknown>;
    const rules = smsSettings?.parserRules as Record<string, string> | undefined;
    const result: Record<string, RegExp> = {};

    for (const provider of ['bkash', 'nagad', 'rocket']) {
      const pattern = rules?.[provider] || DEFAULT_PARSER_RULES[provider];
      result[provider] = new RegExp(pattern, 'is');
    }
    return result;
  } catch {
    // Fallback to defaults if settings aren't available
    const result: Record<string, RegExp> = {};
    for (const [provider, pattern] of Object.entries(DEFAULT_PARSER_RULES)) {
      result[provider] = new RegExp(pattern, 'is');
    }
    return result;
  }
}

function detectProvider(rawSms: string, sender: string): PaymentProvider | 'unknown' {
  const lowerSms = rawSms.toLowerCase();
  const lowerSender = sender.toLowerCase();
  if (lowerSms.includes('bkash') || lowerSms.includes('বিকাশ') || lowerSender.includes('bkash'))
    return 'bkash';
  if (lowerSms.includes('nagad') || lowerSms.includes('নগদ') || lowerSender.includes('nagad'))
    return 'nagad';
  if (lowerSms.includes('rocket') || lowerSms.includes('রকেট') || lowerSender.includes('rocket'))
    return 'rocket';
  return 'unknown';
}

function extractPhone(rawSms: string): string | null {
  const m = rawSms.match(PHONE_REGEX);
  return m ? m[0] : null;
}

function extractAmount(rawSms: string): number | null {
  const m = rawSms.match(AMOUNT_REGEX);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ''));
}

function extractTxnId(rawSms: string, regex: RegExp): string | null {
  const m = rawSms.match(regex);
  return m?.[1] || null;
}

/* ────────── Category Classification ────────── */

export function classifySmsCategory(rawSms: string, provider: PaymentProvider | 'unknown'): SmsCategory {
  const lower = rawSms.toLowerCase();

  // Payment received keywords (user received money).
  // NOTE: `\b` word boundaries are only applied to ASCII patterns — JavaScript's
  // `\b` is not Unicode-aware, so Bengali patterns must NOT use it.
  if (
    /\b(?:received|receive|credited|credit|deposited|deposit)\b/i.test(lower) ||
    /(?:টাকা\s*পেয়েছেন|আপনি\s*টাকা\s*পেয়েছেন)/.test(rawSms) ||
    /\b(?:balance has been credited|has been deposited)\b/i.test(lower)
  ) {
    return 'payment_received';
  }

  // Send money keywords (user sent money to someone)
  if (
    /\b(?:send|sent|transferred|transfer)\b/i.test(lower) ||
    /(?:টাকা\s*পাঠান|পাঠানো|পাঠানো\s*হয়েছে)/.test(rawSms) ||
    /\b(?:has been sent to|sent to)\b/i.test(lower)
  ) {
    return 'send_money';
  }

  // Cash out keywords (user withdrew cash)
  if (
    /\b(?:cash\s*out|withdraw|withdrawn|atm)\b/i.test(lower) ||
    /(?:ক্যাশ\s*আউট|উত্তোলন)/.test(rawSms) ||
    /\b(?:has been withdrawn|withdrawal)\b/i.test(lower)
  ) {
    return 'cash_out';
  }

  // Payment keywords without clear direction (ambiguous)
  if (
    /\b(?:payment|paid|pay|transaction)\b/i.test(lower) ||
    /(?:পেমেন্ট|লেনদেন)/.test(rawSms)
  ) {
    return 'payment_received';
  }

  return 'unknown';
}

function computeConfidence(
  txnId: string | null,
  amount: number | null,
  phone: string | null,
  provider: PaymentProvider | 'unknown',
): number {
  let score = 0;
  if (txnId) score += 0.35;
  if (amount && amount > 0) score += 0.3;
  if (phone) score += 0.2;
  if (provider !== 'unknown') score += 0.15;
  return Math.round(score * 100) / 100;
}

/* ────────── Core: Parse single SMS ────────── */

export async function parseSms(
  rawSms: string,
  sender: string,
  providerHint?: string,
): Promise<ParsedSmsResult> {
  const provider =
    (providerHint as PaymentProvider | undefined) || detectProvider(rawSms, sender);
  const regexes = await loadParserRegex();
  const regex = regexes[provider] || regexes.bkash;

  const txnId = extractTxnId(rawSms, regex);
  const amount = extractAmount(rawSms);
  const phone = extractPhone(rawSms);
  const category = classifySmsCategory(rawSms, provider);
  const confidence = computeConfidence(txnId, amount, phone, provider);

  const issues: string[] = [];
  if (!txnId) issues.push('No transaction ID found');
  if (!amount || amount <= 0) issues.push('No valid amount found');
  if (!phone) issues.push('No phone number found');
  if (provider === 'unknown') issues.push('Provider could not be identified');

  return {
    provider,
    transactionId: txnId,
    amount,
    phone,
    sender,
    category,
    confidence,
    issues,
    rawSms,
  };
}

/* ────────── Auto-match with pending Transaction ────────── */

export async function matchPendingTransaction(parsed: ParsedSmsResult) {
  if (!parsed.transactionId || !parsed.amount) return null;

  // Strategy 1: match by provider + amount + pending status (strictest)
  let match = await Transaction.findOne({
    provider: parsed.provider,
    amount: parsed.amount,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: 1 });

  if (match) return match;

  // Strategy 2: match by customerTransactionId + provider (if Android sent it previously)
  if (parsed.transactionId) {
    match = await Transaction.findOne({
      customerTransactionId: parsed.transactionId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (match) return match;
  }

  // Strategy 3: amount only (widest fallback)
  match = await Transaction.findOne({
    amount: parsed.amount,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: 1 });

  return match || null;
}

/* ────────── Full pipeline: parse → record → match → process ────────── */

export async function processIncomingSms(input: ProcessSmsInput) {
  const { deviceId, rawSms, sender, provider: providerHint, receivedAt } = input;

  // 1. Parse
  const parsed = await parseSms(rawSms, sender, providerHint);

  // 2. Duplicate check: same parsedTxnId already processed
  if (parsed.transactionId) {
    const dup = await SmsTransaction.findOne({
      parsedTxnId: parsed.transactionId,
      provider: parsed.provider,
      status: { $in: ['matched', 'verified'] },
    });
    if (dup) {
      throw new AppError('Duplicate SMS transaction', 409, 'DUPLICATE_SMS');
    }
  }

  // 3. Hash-based duplicate (exact same SMS from same device)
  const smsHash = simpleHash(rawSms);
  const hashDup = await SmsTransaction.findOne({
    deviceId,
    'metadata.smsHash': smsHash,
  });
  if (hashDup) {
    throw new AppError('Duplicate SMS text from same device', 409, 'DUPLICATE_SMS');
  }

  // 4. Create SmsTransaction record
  const smsDoc = await SmsTransaction.create({
    deviceId,
    provider: parsed.provider,
    sender,
    rawSms,
    parsedTxnId: parsed.transactionId,
    parsedAmount: parsed.amount,
    parsedPhone: parsed.phone,
    category: parsed.category,
    parserVersion: '1.0',
    parseConfidence: parsed.confidence,
    status: 'parsed',
    receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
    parsedAt: new Date(),
    metadata: { smsHash, issues: parsed.issues },
  });

  // 5. Try auto-match
  let matchedTransaction = null;
  try {
    matchedTransaction = await matchPendingTransaction(parsed);
  } catch {
    // non-fatal
  }

  if (matchedTransaction) {
    smsDoc.status = 'matched';
    smsDoc.matchedTransactionId = matchedTransaction._id;
    smsDoc.matchedPaymentRequestId = matchedTransaction.paymentRequestId || null;
    smsDoc.verifiedAt = new Date();
    smsDoc.verificationMethod = 'sms';
    await smsDoc.save();

    // Update the Transaction to paid
    matchedTransaction.status = 'paid';
    matchedTransaction.customerTransactionId = parsed.transactionId || matchedTransaction.customerTransactionId;
    matchedTransaction.deviceId = deviceId;
    matchedTransaction.smsRaw = rawSms;
    matchedTransaction.smsSender = sender;
    matchedTransaction.smsReceivedAt = smsDoc.receivedAt;
    matchedTransaction.verifiedAt = new Date();
    matchedTransaction.verificationMethod = 'sms';
    matchedTransaction.metadata = {
      ...matchedTransaction.metadata,
      deviceId,
      trxId: parsed.transactionId,
      smsProcessedAt: new Date().toISOString(),
    };
    await matchedTransaction.save();

    // Update PaymentRequest if linked
    if (matchedTransaction.paymentRequestId) {
      const { PaymentRequest } = await import('../models/index.js');
      await PaymentRequest.updateOne(
        { _id: matchedTransaction.paymentRequestId },
        { status: 'paid', transactionId: parsed.transactionId },
      );
    }

    await createActivityLog({
      action: 'payment_paid',
      message: `SMS auto-matched: ${matchedTransaction.transactionId} — ${parsed.amount} BDT via ${parsed.provider}`,
      entityType: 'SmsTransaction',
      entityId: String(smsDoc._id),
      severity: 'info',
      metadata: {
        deviceId,
        provider: parsed.provider,
        amount: parsed.amount,
        parsedTxnId: parsed.transactionId,
      },
    });

    // Emit real-time event
    emitSmsTransaction({
      type: 'auto_matched',
      smsTransactionId: String(smsDoc._id),
      transactionId: matchedTransaction.transactionId,
      amount: parsed.amount,
      provider: parsed.provider,
      status: 'verified',
    });
  } else {
    // No match — leave as parsed, needs manual verification
    await smsDoc.save();

    await createActivityLog({
      action: 'sms_received',
      message: `SMS received but no match: ${parsed.transactionId || 'no-txn'} — ${parsed.amount || 0} BDT via ${parsed.provider}`,
      entityType: 'SmsTransaction',
      entityId: String(smsDoc._id),
      severity: 'warning',
      metadata: {
        deviceId,
        provider: parsed.provider,
        amount: parsed.amount,
        parsedTxnId: parsed.transactionId,
        issues: parsed.issues,
      },
    });

    // Emit event so admin panel shows it in real time
    emitSmsTransaction({
      type: 'needs_verification',
      smsTransactionId: String(smsDoc._id),
      provider: parsed.provider,
      amount: parsed.amount,
      parsedTxnId: parsed.transactionId,
      category: parsed.category,
      confidence: parsed.confidence,
    });
  }

  return {
    smsTransactionId: String(smsDoc._id),
    status: smsDoc.status,
    category: parsed.category,
    confidence: parsed.confidence,
    parsed: {
      transactionId: parsed.transactionId,
      amount: parsed.amount,
      phone: parsed.phone,
      provider: parsed.provider,
    },
    matched: !!matchedTransaction,
    transactionId: matchedTransaction?.transactionId || null,
  };
}

/* ────────── Admin: Test parser ────────── */

export async function testParser(rawSms: string, provider?: string) {
  const parsed = await parseSms(rawSms, provider || 'unknown', provider);

  await createActivityLog({
    action: 'sms_received',
    message: `SMS parser test: ${provider || 'auto'} — confidence ${parsed.confidence}`,
    entityType: 'SmsTest',
    severity: 'info',
    metadata: { parsed },
  });

  return {
    parsed,
    issues: parsed.issues,
    rawJson: parsed,
  };
}

/* ────────── Admin: Get parser rules ────────── */

export async function getParserRules() {
  try {
    const smsSettings = (await getSettings('sms')) as Record<string, unknown>;
    return {
      parserRules: smsSettings?.parserRules || DEFAULT_PARSER_RULES,
      defaults: DEFAULT_PARSER_RULES,
    };
  } catch {
    return { parserRules: DEFAULT_PARSER_RULES, defaults: DEFAULT_PARSER_RULES };
  }
}

/* ────────── Admin: Update parser rules ────────── */

export async function updateParserRules(
  rules: Record<string, string>,
  userId?: string,
) {
  // Validate each pattern compiles
  for (const [provider, pattern] of Object.entries(rules)) {
    try {
      new RegExp(pattern);
    } catch {
      throw new AppError(`Invalid regex for provider "${provider}": ${pattern}`, 400, 'INVALID_REGEX');
    }
  }

  const { updateSettings } = await import('./systemSettings.service.js');
  const updated = await updateSettings('sms', { parserRules: rules }, userId);

  await createActivityLog({
    userId,
    action: 'settings_updated',
    message: 'SMS parser rules updated',
    entityType: 'SystemSettings',
    entityId: 'sms/config',
    severity: 'info',
    metadata: { rules },
  });

  return { parserRules: updated.parserRules || rules };
}

/* ────────── Admin: List SMS transactions ────────── */

export async function listSmsTransactions(query: {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.provider) filter.provider = query.provider;
  if (query.category) filter.category = query.category;

  if (query.search) {
    filter.$or = [
      { parsedTxnId: { $regex: query.search, $options: 'i' } },
      { parsedPhone: { $regex: query.search, $options: 'i' } },
      { sender: { $regex: query.search, $options: 'i' } },
      { deviceId: { $regex: query.search, $options: 'i' } },
    ];
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate)
      (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
    if (query.endDate)
      (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
  }

  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const [smsTxns, total] = await Promise.all([
    SmsTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SmsTransaction.countDocuments(filter),
  ]);

  return {
    smsTransactions: smsTxns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/* ────────── Admin: Single SMS transaction ────────── */

export async function getSmsTransaction(id: string) {
  const doc = await SmsTransaction.findById(id).lean();
  if (!doc) throw new AppError('SMS transaction not found', 404, 'NOT_FOUND');
  return doc;
}

/* ────────── Admin: SMS transaction stats ────────── */

export async function getSmsTransactionStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [statusCounts, todayCount, categoryCounts, providerCounts] = await Promise.all([
    SmsTransaction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    SmsTransaction.countDocuments({ createdAt: { $gte: todayStart } }),
    SmsTransaction.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    SmsTransaction.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: '$provider', count: { $sum: 1 } } },
    ]),
  ]);

  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s: any) => (statusMap[s._id] = s.count));

  return {
    todayReceived: todayCount,
    total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    byStatus: statusMap,
    byCategory: categoryCounts.map((c: any) => ({ category: c._id, count: c.count })),
    byProvider: providerCounts.map((p: any) => ({ provider: p._id, count: p.count })),
    needsVerification: statusMap['parsed'] || 0,
    autoMatched: statusMap['matched'] || 0,
    verified: statusMap['verified'] || 0,
    rejected: statusMap['rejected'] || 0,
  };
}

/* ────────── Internal util ────────── */

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
