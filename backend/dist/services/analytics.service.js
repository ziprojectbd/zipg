import { Transaction } from '../models/index.js';
export async function getDashboardOverview() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [todayRevenue, todayTransactions, weekRevenue, monthRevenue, pendingCount, successCount, failedCount, totalRevenue, totalTransactions, providerBreakdown,] = await Promise.all([
        Transaction.aggregate([
            { $match: { status: 'paid', updatedAt: { $gte: startOfToday } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Transaction.countDocuments({ createdAt: { $gte: startOfToday } }),
        Transaction.aggregate([
            { $match: { status: 'paid', updatedAt: { $gte: startOfWeek } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
            { $match: { status: 'paid', updatedAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.countDocuments({ status: 'pending' }),
        Transaction.countDocuments({ status: 'paid' }),
        Transaction.countDocuments({ status: 'failed' }),
        Transaction.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Transaction.countDocuments(),
        Transaction.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: '$provider', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
        ]),
    ]);
    const totalRev = totalRevenue[0]?.total || 0;
    const totalCount = totalRevenue[0]?.count || 0;
    const averagePayment = totalCount > 0 ? (totalRev / totalCount) : 0;
    return {
        metrics: {
            todayRevenue: todayRevenue[0]?.total || 0,
            todayTransactions: todayTransactions,
            weekRevenue: weekRevenue[0]?.total || 0,
            monthRevenue: monthRevenue[0]?.total || 0,
            pendingCount,
            successCount,
            failedCount,
            totalRevenue: totalRev,
            totalTransactions,
            averagePayment: Math.round(averagePayment * 100) / 100,
        },
        providerBreakdown: providerBreakdown.map((p) => ({
            name: p._id,
            revenue: p.revenue,
            count: p.count,
            percentage: totalRev > 0 ? Math.round((p.revenue / totalRev) * 1000) / 10 : 0,
        })),
    };
}
export async function getRevenueChart(query) {
    const { dateFormat, groupBy, startDate, endDate } = getDateAggregation(query);
    const pipeline = [
        { $match: { status: 'paid' } },
    ];
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.$gte = startDate;
        if (endDate)
            dateFilter.$lte = endDate;
        pipeline.push({ $match: { updatedAt: dateFilter } });
    }
    if (query.provider) {
        pipeline.push({ $match: { provider: query.provider } });
    }
    pipeline.push({
        $group: {
            _id: dateFormat,
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
        },
    }, { $sort: { _id: 1 } });
    const data = await Transaction.aggregate(pipeline);
    return data.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        transactions: item.count,
    }));
}
export async function getTransactionStats(query) {
    const { startDate, endDate } = getDateAggregation(query);
    const matchFilter = {};
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.$gte = startDate;
        if (endDate)
            dateFilter.$lte = endDate;
        matchFilter.createdAt = dateFilter;
    }
    const stats = await Transaction.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
            },
        },
    ]);
    const result = {};
    stats.forEach((s) => {
        result[s._id] = { count: s.count, totalAmount: s.totalAmount };
    });
    return result;
}
export async function getProviderAnalytics(query) {
    const { startDate, endDate } = getDateAggregation(query);
    const matchFilter = { status: 'paid' };
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.$gte = startDate;
        if (endDate)
            dateFilter.$lte = endDate;
        matchFilter.updatedAt = dateFilter;
    }
    const breakdown = await Transaction.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: '$provider',
                revenue: { $sum: '$amount' },
                count: { $sum: 1 },
                avgAmount: { $avg: '$amount' },
                avgProcessingTime: {
                    $avg: {
                        $cond: [
                            { $and: [{ $ne: ['$verifiedAt', null] }, { $ne: ['$createdAt', null] }] },
                            { $subtract: ['$verifiedAt', '$createdAt'] },
                            null,
                        ],
                    },
                },
            },
        },
        { $sort: { revenue: -1 } },
    ]);
    return breakdown.map((p) => ({
        provider: p._id,
        revenue: p.revenue,
        count: p.count,
        avgAmount: Math.round(p.avgAmount * 100) / 100,
        avgProcessingTimeMs: Math.round(p.avgProcessingTime || 0),
    }));
}
export async function getSuccessRate(query) {
    const { startDate, endDate, dateFormat } = getDateAggregation(query);
    const matchFilter = {};
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.$gte = startDate;
        if (endDate)
            dateFilter.$lte = endDate;
        matchFilter.createdAt = dateFilter;
    }
    const data = await Transaction.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: { date: dateFormat, status: '$status' },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.date': 1 } },
    ]);
    const grouped = {};
    data.forEach((item) => {
        const date = item._id.date;
        if (!grouped[date])
            grouped[date] = { total: 0, paid: 0, failed: 0 };
        grouped[date].total += item.count;
        if (item._id.status === 'paid')
            grouped[date].paid += item.count;
        if (item._id.status === 'failed')
            grouped[date].failed += item.count;
    });
    return Object.entries(grouped).map(([date, stats]) => ({
        date,
        total: stats.total,
        paid: stats.paid,
        failed: stats.failed,
        rate: stats.total > 0 ? Math.round((stats.paid / stats.total) * 1000) / 10 : 0,
    }));
}
function getDateAggregation(query) {
    const now = new Date();
    let startDate;
    let endDate;
    let dateFormat;
    let groupBy;
    if (query.startDate)
        startDate = new Date(query.startDate);
    if (query.endDate)
        endDate = new Date(query.endDate);
    switch (query.period) {
        case 'daily':
            dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
            groupBy = 'day';
            if (!startDate) {
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
            }
            break;
        case 'weekly':
            dateFormat = {
                $dateToString: {
                    format: '%Y-W%V',
                    date: '$createdAt',
                },
            };
            groupBy = 'week';
            if (!startDate) {
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 90);
            }
            break;
        case 'monthly':
            dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
            groupBy = 'month';
            if (!startDate) {
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 12);
            }
            break;
        case 'yearly':
            dateFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
            groupBy = 'year';
            if (!startDate) {
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 5);
            }
            break;
    }
    if (!endDate)
        endDate = now;
    return { dateFormat, groupBy, startDate, endDate };
}
