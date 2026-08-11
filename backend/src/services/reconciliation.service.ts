import { Transaction, PaymentRequest } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';

/* ────────── Types ────────── */

interface ReconciliationQuery {
  startDate?: string;
  endDate?: string;
  provider?: string;
}

interface MismatchQuery {
  page?: number;
  limit?: number;
  type?: 'status_mismatch' | 'orphaned' | 'all';
}

interface MismatchResult {
  mismatches: Array<{
    transaction: Record<string, unknown>;
    paymentRequest: Record<string, unknown> | null;
    mismatchType?: 'status_mismatch' | 'orphaned';
    type?: 'status_mismatch' | 'orphaned';
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/* ────────── Helpers ────────── */

function buildDateFilter(query: ReconciliationQuery): Record<string, unknown> | null {
  if (!query.startDate && !query.endDate) return null;
  const filter: Record<string, Date> = {};
  if (query.startDate) filter.$gte = new Date(query.startDate);
  if (query.endDate) filter.$lte = new Date(query.endDate);
  return filter;
}

/* ────────── Summary ────────── */

export async function getReconciliationSummary(query: ReconciliationQuery = {}) {
  const matchFilter: Record<string, unknown> = {};
  const dateFilter = buildDateFilter(query);
  if (dateFilter) matchFilter.createdAt = dateFilter;
  if (query.provider) matchFilter.provider = query.provider;

  const [statusCounts, amountSums] = await Promise.all([
    Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] },
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] },
          },
        },
      },
    ]),
  ]);

  // Build a map of status -> count
  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s: any) => {
    statusMap[s._id] = s.count;
  });

  const totalTransactions = statusCounts.reduce(
    (sum: number, s: any) => sum + s.count,
    0
  );
  const paidAmount = amountSums[0]?.paidAmount || 0;
  const pendingAmount = amountSums[0]?.pendingAmount || 0;

  // Count status mismatches: transactions whose status differs from their paymentRequest's status
  const mismatchedAgg = await Transaction.aggregate([
    {
      $match: {
        ...matchFilter,
        paymentRequestId: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: 'paymentrequests',
        localField: 'paymentRequestId',
        foreignField: '_id',
        as: 'paymentRequest',
      },
    },
    { $unwind: '$paymentRequest' },
    {
      $match: {
        $expr: { $ne: ['$status', '$paymentRequest.status'] },
      },
    },
    { $count: 'count' },
  ]);
  const mismatchedCount = mismatchedAgg[0]?.count || 0;

  // Count orphaned transactions: no paymentRequestId, or paymentRequest doesn't exist
  const orphanedAgg = await Transaction.aggregate([
    {
      $match: {
        ...matchFilter,
        $or: [
          { paymentRequestId: { $eq: null } },
          { paymentRequestId: { $exists: false } },
        ],
      },
    },
    { $count: 'count' },
  ]);

  // Also count transactions whose paymentRequestId points to a deleted paymentRequest
  const danglingAgg = await Transaction.aggregate([
    {
      $match: {
        ...matchFilter,
        paymentRequestId: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: 'paymentrequests',
        localField: 'paymentRequestId',
        foreignField: '_id',
        as: 'paymentRequest',
      },
    },
    { $match: { paymentRequest: { $size: 0 } } },
    { $count: 'count' },
  ]);

  const orphanedCount =
    (orphanedAgg[0]?.count || 0) + (danglingAgg[0]?.count || 0);

  await createActivityLog({
    action: 'reconciliation_check',
    message: `Reconciliation summary generated: ${totalTransactions} transactions, ${mismatchedCount} mismatches, ${orphanedCount} orphaned`,
    severity: mismatchedCount > 0 || orphanedCount > 0 ? 'warning' : 'info',
    metadata: {
      totalTransactions,
      mismatchedCount,
      orphanedCount,
      provider: query.provider,
    },
  });

  return {
    totalTransactions,
    totalPaid: statusMap['paid'] || 0,
    totalPending: statusMap['pending'] || 0,
    totalFailed: statusMap['failed'] || 0,
    totalExpired: statusMap['expired'] || 0,
    totalCancelled: statusMap['cancelled'] || 0,
    paidAmount,
    pendingAmount,
    mismatchedCount,
    orphanedCount,
  };
}

/* ────────── Mismatches ────────── */

export async function getMismatches(query: MismatchQuery = {}): Promise<MismatchResult> {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;
  const type = query.type || 'all';

  if (type === 'status_mismatch') {
    const matchFilter = { paymentRequestId: { $exists: true, $ne: null } };

    const countPipeline: any[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'paymentrequests',
          localField: 'paymentRequestId',
          foreignField: '_id',
          as: 'paymentRequest',
        },
      },
      { $unwind: '$paymentRequest' },
      { $match: { $expr: { $ne: ['$status', '$paymentRequest.status'] } } },
      { $count: 'total' },
    ];

    const dataPipeline: any[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'paymentrequests',
          localField: 'paymentRequestId',
          foreignField: '_id',
          as: 'paymentRequest',
        },
      },
      { $unwind: '$paymentRequest' },
      { $match: { $expr: { $ne: ['$status', '$paymentRequest.status'] } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [countResult, data] = await Promise.all([
      Transaction.aggregate(countPipeline),
      Transaction.aggregate(dataPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      mismatches: data.map((item: any) => ({
        type: 'status_mismatch',
        transaction: {
          _id: item._id,
          transactionId: item.transactionId,
          status: item.status,
          amount: item.amount,
          provider: item.provider,
          createdAt: item.createdAt,
        },
        paymentRequest: item.paymentRequest
          ? {
              _id: item.paymentRequest._id,
              requestId: item.paymentRequest.requestId,
              status: item.paymentRequest.status,
              amount: item.paymentRequest.amount,
              provider: item.paymentRequest.provider,
              createdAt: item.paymentRequest.createdAt,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  if (type === 'orphaned') {
    // Orphaned: no paymentRequestId or paymentRequest doesn't exist
    const orphanedNoLink = {
      $or: [
        { paymentRequestId: { $eq: null } },
        { paymentRequestId: { $exists: false } },
      ],
    };

    const countNoLinkPipeline: any[] = [
      { $match: orphanedNoLink },
      { $count: 'total' },
    ];

    const dataNoLinkPipeline: any[] = [
      { $match: orphanedNoLink },
      { $addFields: { paymentRequest: null } },
      { $sort: { createdAt: -1 } },
    ];

    // Dangling references
    const danglingMatch = { paymentRequestId: { $exists: true, $ne: null } };
    const countDanglingPipeline: any[] = [
      { $match: danglingMatch },
      {
        $lookup: {
          from: 'paymentrequests',
          localField: 'paymentRequestId',
          foreignField: '_id',
          as: 'paymentRequest',
        },
      },
      { $match: { paymentRequest: { $size: 0 } } },
      { $count: 'total' },
    ];

    const dataDanglingPipeline: any[] = [
      { $match: danglingMatch },
      {
        $lookup: {
          from: 'paymentrequests',
          localField: 'paymentRequestId',
          foreignField: '_id',
          as: 'paymentRequest',
        },
      },
      { $match: { paymentRequest: { $size: 0 } } },
      { $addFields: { paymentRequest: { $arrayElemAt: ['$paymentRequest', 0] } } },
      { $sort: { createdAt: -1 } },
    ];

    const [countNoLinkResult, countDanglingResult, dataNoLink, dataDangling] =
      await Promise.all([
        Transaction.aggregate(countNoLinkPipeline),
        Transaction.aggregate(countDanglingPipeline),
        Transaction.aggregate(dataNoLinkPipeline),
        Transaction.aggregate(dataDanglingPipeline),
      ]);

    const totalNoLink = countNoLinkResult[0]?.total || 0;
    const totalDangling = countDanglingResult[0]?.total || 0;
    const total = totalNoLink + totalDangling;

    // Merge and sort by createdAt descending, then paginate
    const allOrphaned = [...dataNoLink, ...dataDangling].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = allOrphaned.slice(skip, skip + limit);

    return {
      mismatches: paginated.map((item: any) => ({
        type: 'orphaned',
        transaction: {
          _id: item._id,
          transactionId: item.transactionId,
          status: item.status,
          amount: item.amount,
          provider: item.provider,
          paymentRequestId: item.paymentRequestId,
          createdAt: item.createdAt,
        },
        paymentRequest: item.paymentRequest || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  // type === 'all' — combine both mismatch and orphaned
  // We'll use a simpler approach: run both and merge
  const [mismatchResult, orphanedResult] = await Promise.all([
    getMismatches({ page: 1, limit: 1000, type: 'status_mismatch' }),
    getMismatches({ page: 1, limit: 1000, type: 'orphaned' }),
  ]);

  const allItems = [
    ...mismatchResult.mismatches,
    ...orphanedResult.mismatches,
  ].sort(
    (a: any, b: any) =>
      new Date(b.transaction.createdAt).getTime() -
      new Date(a.transaction.createdAt).getTime()
  );

  const total = allItems.length;
  const paginated = allItems.slice(skip, skip + limit);

  return {
    mismatches: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/* ────────── Daily Reconciliation ────────── */

export async function getDailyReconciliation(query: ReconciliationQuery = {}) {
  const matchFilter: Record<string, unknown> = {};
  const dateFilter = buildDateFilter(query);
  if (dateFilter) matchFilter.createdAt = dateFilter;
  if (query.provider) matchFilter.provider = query.provider;

  const data = await Transaction.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status',
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.date': 1, '_id.status': 1 } },
  ]);

  // Pivot status rows into a flat per-day record
  const dayMap: Record<
    string,
    {
      date: string;
      created: number;
      paid: number;
      pending: number;
      failed: number;
      expired: number;
      cancelled: number;
      paidAmount: number;
    }
  > = {};

  data.forEach((item: any) => {
    const date = item._id.date;
    if (!dayMap[date]) {
      dayMap[date] = {
        date,
        created: 0,
        paid: 0,
        pending: 0,
        failed: 0,
        expired: 0,
        cancelled: 0,
        paidAmount: 0,
      };
    }
    dayMap[date].created += item.count;
    if (item._id.status in dayMap[date]) {
      (dayMap[date] as any)[item._id.status] += item.count;
    }
    if (item._id.status === 'paid') {
      dayMap[date].paidAmount += item.amount;
    }
  });

  return Object.values(dayMap);
}
