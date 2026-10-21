import { FastifyRequest, FastifyReply } from 'fastify';
import dayjs from 'dayjs';
import Activity from "../models/Activity.js";
import Client from "../models/Client.js";
import AssignedMembership from "../models/AssignedMembership.js";
import mongoose from "mongoose";
import {
    addUtcDays,
    endOfIstDayExclusive,
    lastMtdEndExclusive,
    parseToISTMidnight,
    startOfMonthMonthsAgo,
    startOfPreviousMonth,
    utcStartOfDay,
    utcStartOfMonth,
} from "../utils/timeUtils.js";
import { cache, getCacheKey } from "../utils/cache.js";

const IST = 'Asia/Kolkata';

const uniqueMemberOids = (memberships: { primaryMemberId?: any; memberIds?: any[] }[]) => {
    const ids = new Set<string>();
    for (const m of memberships) {
        if (m.primaryMemberId) ids.add(String(m.primaryMemberId));
        for (const id of m.memberIds || []) ids.add(String(id));
    }
    return [...ids].map((id) => new mongoose.Types.ObjectId(id));
};

const calculateTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

const getSixMonthsAgoStart = (today: Date) => startOfMonthMonthsAgo(5, today);

const resolveInclusiveRange = (fromStr?: string, toStr?: string, fallbackFrom?: Date, fallbackToExclusive?: Date) => {
    const from = fromStr ? parseToISTMidnight(fromStr) : fallbackFrom;
    const toExclusive = toStr ? endOfIstDayExclusive(toStr) : fallbackToExclusive;
    if (!from || !toExclusive || Number.isNaN(from.getTime()) || Number.isNaN(toExclusive.getTime())) {
        return { error: 'Invalid date range' as const };
    }
    if (from >= toExclusive) {
        return { error: 'End date must be on or after start date' as const };
    }
    const maxExclusive = dayjs(from).tz(IST).add(6, 'month').add(1, 'day').startOf('day');
    if (dayjs(toExclusive).isAfter(maxExclusive)) {
        return { error: 'Range cannot exceed 6 months' as const };
    }
    return { from, toExclusive };
};

const getRevenueTrend = async (gymId: string, today: Date) => {
    const sixMonthsAgo = getSixMonthsAgoStart(today);

    const monthlyRevenueRaw = await Client.aggregate([
        { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
        { $unwind: "$paymentHistory" },
        { $match: { "paymentHistory.date": { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    month: { $month: { date: "$paymentHistory.date", timezone: IST } },
                    year: { $year: { date: "$paymentHistory.date", timezone: IST } }
                },
                total: { $sum: "$paymentHistory.amount" }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthlyRevenueRaw.map(item => ({
        label: months[item._id.month - 1],
        amount: item.total
    }));
};

export const getDashboardSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const cacheKey = getCacheKey('dashboard_summary', gymId);

        const cachedSummary = cache.get(cacheKey);
        if (cachedSummary) {
            return reply.send({ success: true, data: cachedSummary });
        }

        const today = utcStartOfDay();
        const startOfCurrent = utcStartOfMonth(today);
        const startOfLast = startOfPreviousMonth(today);
        const lastMtdExclusive = lastMtdEndExclusive(today);
        const thirtyDaysAgo = addUtcDays(today, -30);
        const fourteenDaysAgo = addUtcDays(today, -14);
        const sevenDaysFromNow = addUtcDays(today, 7);

        const tomorrow = addUtcDays(today, 1);
        const sixMonthsAgo = getSixMonthsAgoStart(today);

        const [
            totalClients,
            activeCount,
            expiredCount,
            activeCount30DaysAgo,
            expiringSoonParams,
            expiringMembersList,
            revenueCurrent,
            revenueLastMTD,
            payingThisMonth,
            endedLast30,
            endedLast14,
            newlyJoinedCurrent,
            newlyJoinedLastMTD,
            recentActivities,
            revenueTrend,
            todayCollection,
            totalOutstanding,
            clientsWithBalance,
            expiringToday,
            paymentMethodsToday,
            topBalanceClients,
            topSellingPlansRaw,
        ] = await Promise.all([
            Client.countDocuments({ gymId }),
            Client.countDocuments({ gymId, membershipStatus: 'active' }),
            Client.countDocuments({ gymId, membershipStatus: { $in: ['expired', 'trial_expired'] } }),
            Client.countDocuments({
                gymId,
                membershipStatus: 'active',
                createdAt: { $lte: thirtyDaysAgo }
            }),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId), membershipStatus: 'active', upcomingMembership: null } },
                {
                    $lookup: {
                        from: 'assignedmemberships',
                        localField: 'activeMembership',
                        foreignField: '_id',
                        as: 'activePlan'
                    }
                },
                { $unwind: '$activePlan' },
                {
                    $match: {
                        'activePlan.endDate': { $gte: today, $lte: sevenDaysFromNow }
                    }
                },
                { $count: 'count' }
            ]),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId), membershipStatus: 'active', upcomingMembership: null } },
                {
                    $lookup: {
                        from: 'assignedmemberships',
                        localField: 'activeMembership',
                        foreignField: '_id',
                        as: 'activePlan'
                    }
                },
                { $unwind: '$activePlan' },
                {
                    $match: {
                        'activePlan.endDate': { $gte: today, $lte: sevenDaysFromNow }
                    }
                },
                { $sort: { 'activePlan.endDate': 1 } },
                { $limit: 5 },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        endDate: '$activePlan.endDate'
                    }
                }
            ]),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: startOfCurrent } } },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } }
            ]),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: startOfLast, $lt: lastMtdExclusive } } },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } }
            ]),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: startOfCurrent } } },
                { $group: { _id: "$_id" } },
                { $count: "count" }
            ]),
            AssignedMembership.find({
                gymId,
                endDate: { $gte: thirtyDaysAgo, $lt: tomorrow },
            }).select('primaryMemberId memberIds').lean(),
            AssignedMembership.find({
                gymId,
                endDate: { $gte: fourteenDaysAgo, $lt: tomorrow },
            }).select('primaryMemberId memberIds').lean(),
            Client.countDocuments({ gymId, createdAt: { $gte: startOfCurrent } }),
            Client.countDocuments({ gymId, createdAt: { $gte: startOfLast, $lt: lastMtdExclusive } }),
            Activity.find({ gymId }).sort({ date: -1 }).limit(10).lean(),
            getRevenueTrend(gymId, today),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: today, $lt: tomorrow } } },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } }
            ]),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId), balance: { $gt: 0 } } },
                { $group: { _id: null, total: { $sum: "$balance" }, count: { $sum: 1 } } }
            ]),
            Client.countDocuments({ gymId, balance: { $gt: 0 } }),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId), membershipStatus: 'active' } },
                { $lookup: { from: 'assignedmemberships', localField: 'activeMembership', foreignField: '_id', as: 'activePlan' } },
                { $unwind: '$activePlan' },
                { $match: { 'activePlan.endDate': { $gte: today, $lt: tomorrow } } },
                { $count: 'count' }
            ]),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: today, $lt: tomorrow } } },
                { $group: { _id: "$paymentHistory.method", total: { $sum: "$paymentHistory.amount" }, count: { $sum: 1 } } }
            ]),
            Client.find({ gymId, balance: { $gt: 0 } })
                .select('name balance')
                .sort({ balance: -1 })
                .limit(3)
                .lean(),
            AssignedMembership.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId), createdAt: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: '$planId',
                        planName: { $first: '$planName' },
                        count: { $sum: 1 },
                        revenue: { $sum: '$totalAmount' },
                    },
                },
                { $sort: { count: -1 } },
            ]),
        ]);

        const revCurrentVal = revenueCurrent[0]?.total || 0;
        const revLastVal = revenueLastMTD[0]?.total || 0;
        const expiringSoon = expiringSoonParams[0]?.count || 0;
        const payingCount = payingThisMonth[0]?.count || 0;
        const ended30Ids = uniqueMemberOids(endedLast30 as any[]);
        const ended14Ids = uniqueMemberOids(endedLast14 as any[]);
        const [renewedCount, recentlyExpiredCount] = await Promise.all([
            ended30Ids.length
                ? Client.countDocuments({
                    gymId,
                    _id: { $in: ended30Ids },
                    $or: [
                        { membershipStatus: { $in: ['active', 'future', 'trial', 'paused'] } },
                        { upcomingMembership: { $ne: null } },
                    ],
                })
                : 0,
            ended14Ids.length
                ? Client.countDocuments({
                    gymId,
                    _id: { $in: ended14Ids },
                    membershipStatus: { $in: ['expired', 'trial_expired'] },
                })
                : 0,
        ]);
        const retentionRate = ended30Ids.length > 0
            ? parseFloat(((renewedCount / ended30Ids.length) * 100).toFixed(1))
            : 0;
        const avgRevenuePerMember = payingCount > 0
            ? parseFloat((revCurrentVal / payingCount).toFixed(0))
            : 0;

        const totalPlanSalesLast6Months = topSellingPlansRaw.reduce(
            (sum: number, p: { count: number }) => sum + p.count,
            0
        );
        const totalPlanRevenueLast6Months = topSellingPlansRaw.reduce(
            (sum: number, p: { revenue?: number }) => sum + (p.revenue || 0),
            0
        );
        const topSellingPlansLast6Months = topSellingPlansRaw.map((p: any) => {
            const revenue = p.revenue || 0;
            return {
                planId: String(p._id),
                planName: p.planName || 'Unknown plan',
                count: p.count,
                sharePercent: totalPlanSalesLast6Months > 0
                    ? Math.round((p.count / totalPlanSalesLast6Months) * 100)
                    : 0,
                revenue,
                avgSaleAmount: p.count > 0 ? Math.round(revenue / p.count) : 0,
            };
        });

        const expiringMembers = expiringMembersList.map((member: any) => {
            const endDate = new Date(member.endDate);
            const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                _id: member._id,
                name: member.name,
                daysLeft
            };
        });

        const responseData = {
            totalClients,
            activeMembers: {
                value: activeCount,
                trend: calculateTrend(activeCount, activeCount30DaysAgo),
                comparisonText: "vs 30 days ago"
            },
            expiredMembers: expiredCount,
            recentlyExpiredMembers: recentlyExpiredCount,
            expiringIn7Days: expiringSoon,
            expiringMembersList: expiringMembers,
            retentionRate,
            avgRevenuePerMember,
            revenueTrend,
            revenueThisMonth: {
                value: revCurrentVal,
                trend: calculateTrend(revCurrentVal, revLastVal),
                comparisonText: "vs same days last month"
            },
            newlyJoinedThisMonth: {
                value: newlyJoinedCurrent,
                trend: calculateTrend(newlyJoinedCurrent, newlyJoinedLastMTD),
                comparisonText: "vs same days last month"
            },
            activities: recentActivities,
            todayCollection: todayCollection[0]?.total || 0,
            totalOutstanding: totalOutstanding[0]?.total || 0,
            clientsWithBalance: clientsWithBalance || totalOutstanding[0]?.count || 0,
            expiringToday: expiringToday[0]?.count || 0,
            paymentMethodsToday: paymentMethodsToday.map((p: any) => ({
                method: p._id,
                amount: p.total,
                count: p.count,
            })),
            topBalanceClients: topBalanceClients.map((c: any) => ({
                _id: c._id,
                name: c.name,
                balance: c.balance,
            })),
            topSellingPlansLast6Months,
            totalPlanSalesLast6Months,
            totalPlanRevenueLast6Months,
        };

        cache.set(cacheKey, responseData);

        return reply.send({
            success: true,
            data: responseData
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getRevenueStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const { from: fromStr, to: toStr, page: pageStr, limit: limitStr } = (request.query as { from?: string; to?: string; page?: string; limit?: string }) || {};
        const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(limitStr || '50', 10) || 50));
        const today = utcStartOfDay();
        const range = resolveInclusiveRange(
            fromStr,
            toStr,
            utcStartOfMonth(today),
            addUtcDays(today, 1),
        );
        if ('error' in range) {
            return reply.status(400).send({ success: false, error: range.error });
        }
        const { from, toExclusive } = range;
        const gymOid = new mongoose.Types.ObjectId(gymId);
        const dateMatch = { "paymentHistory.date": { $gte: from, $lt: toExclusive } };

        const transactionsQuery = Client.aggregate([
            { $match: { gymId: gymOid } },
            { $unwind: "$paymentHistory" },
            { $match: dateMatch },
            { $sort: { "paymentHistory.date": -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit + 1 },
            {
                $project: {
                    clientId: "$_id",
                    clientName: "$name",
                    amount: "$paymentHistory.amount",
                    date: "$paymentHistory.date",
                    method: "$paymentHistory.method",
                    remarks: "$paymentHistory.remarks",
                    type: "$paymentHistory.type",
                },
            },
        ]);

        if (page > 1) {
            const raw = await transactionsQuery;
            const hasMore = raw.length > limit;
            return reply.send({
                success: true,
                data: { transactions: hasMore ? raw.slice(0, limit) : raw, page, hasMore },
            });
        }

        const [dailyRaw, paymentMethodsRaw, transactionsRaw, totalRaw] = await Promise.all([
            Client.aggregate([
                { $match: { gymId: gymOid } },
                { $unwind: "$paymentHistory" },
                { $match: dateMatch },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$paymentHistory.date', timezone: IST },
                        },
                        amount: { $sum: '$paymentHistory.amount' },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Client.aggregate([
                { $match: { gymId: gymOid } },
                { $unwind: "$paymentHistory" },
                { $match: dateMatch },
                {
                    $group: {
                        _id: "$paymentHistory.method",
                        total: { $sum: "$paymentHistory.amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            transactionsQuery,
            Client.aggregate([
                { $match: { gymId: gymOid } },
                { $unwind: "$paymentHistory" },
                { $match: dateMatch },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } },
            ]),
        ]);

        const amountByDate = new Map(dailyRaw.map((row) => [row._id, row.amount]));
        const daily: { date: string; amount: number }[] = [];
        for (let d = dayjs(from).tz(IST); d.isBefore(dayjs(toExclusive)); d = d.add(1, 'day')) {
            const key = d.format('YYYY-MM-DD');
            daily.push({ date: key, amount: amountByDate.get(key) || 0 });
        }

        const hasMore = transactionsRaw.length > limit;
        return reply.send({
            success: true,
            data: {
                total: totalRaw[0]?.total || 0,
                daily,
                paymentMethods: paymentMethodsRaw.map((p) => ({
                    method: p._id,
                    amount: p.total,
                    count: p.count,
                })),
                transactions: hasMore ? transactionsRaw.slice(0, limit) : transactionsRaw,
                page,
                hasMore,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getActivities = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const query = (request.query as { from?: string; to?: string; page?: string; limit?: string }) || {};
        const today = utcStartOfDay();
        const range = resolveInclusiveRange(
            query.from,
            query.to,
            today,
            addUtcDays(today, 1),
        );
        if ('error' in range) {
            return reply.status(400).send({ success: false, error: range.error });
        }
        const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10) || 20));
        const items = await Activity.find({
            gymId,
            date: { $gte: range.from, $lt: range.toExclusive },
        })
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit + 1)
            .lean();
        const hasMore = items.length > limit;
        return reply.send({
            success: true,
            data: {
                items: hasMore ? items.slice(0, limit) : items,
                page,
                hasMore,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
