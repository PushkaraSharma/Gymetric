import { FastifyRequest, FastifyReply } from 'fastify';
import Activity from "../models/Activity.js";
import Client from "../models/Client.js";
import mongoose from "mongoose";
import { addUtcDays, utcStartOfDay, utcStartOfMonth } from "../utils/Helper.js";
import { cache, getCacheKey } from "../utils/cache.js";

const calculateTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

const getRevenueTrend = async (gymId: string, today: Date) => {
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyRevenueRaw = await Client.aggregate([
        { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
        { $unwind: "$paymentHistory" },
        { $match: { "paymentHistory.date": { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    month: { $month: "$paymentHistory.date" },
                    year: { $year: "$paymentHistory.date" }
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
        const startOfLast = utcStartOfMonth(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));
        const endOfLastMTD = addUtcDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, today.getUTCDate())), 0);
        const thirtyDaysAgo = addUtcDays(today, -30);
        const sevenDaysFromNow = addUtcDays(today, 7);

        const [
            totalClients,
            activeCount,
            expiredCount,
            activeCount30DaysAgo,
            expiringSoonParams,
            expiringMembersList,
            revenueCurrent,
            revenueLastMTD,
            newlyJoinedCurrent,
            newlyJoinedLastMTD,
            recentActivities,
            revenueTrend
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
                { $match: { "paymentHistory.date": { $gte: startOfLast, $lte: endOfLastMTD } } },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } }
            ]),
            Client.countDocuments({ gymId, createdAt: { $gte: startOfCurrent } }),
            Client.countDocuments({ gymId, createdAt: { $gte: startOfLast, $lte: endOfLastMTD } }),
            Activity.find({ gymId }).sort({ date: -1 }).limit(10).lean(),
            getRevenueTrend(gymId, today)
        ]);

        const revCurrentVal = revenueCurrent[0]?.total || 0;
        const revLastVal = revenueLastMTD[0]?.total || 0;
        const expiringSoon = expiringSoonParams[0]?.count || 0;
        const retentionRate = totalClients > 0
            ? parseFloat(((activeCount / totalClients) * 100).toFixed(1))
            : 0;
        const avgRevenuePerMember = activeCount > 0
            ? parseFloat((revCurrentVal / activeCount).toFixed(0))
            : 0;

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
            expiringIn7Days: expiringSoon,
            expiringMembersList: expiringMembers,
            retentionRate,
            avgRevenuePerMember,
            revenueTrend,
            revenueThisMonth: {
                value: revCurrentVal,
                trend: calculateTrend(revCurrentVal, revLastVal),
                comparisonText: "vs previous MTD"
            },
            newlyJoinedThisMonth: {
                value: newlyJoinedCurrent,
                trend: calculateTrend(newlyJoinedCurrent, newlyJoinedLastMTD),
                comparisonText: "vs previous MTD"
            },
            activities: recentActivities
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
        const today = utcStartOfDay();
        const startOfCurrent = utcStartOfMonth(today);

        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const monthlyRevenueRaw = await Client.aggregate([
            { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
            { $unwind: "$paymentHistory" },
            { $match: { "paymentHistory.date": { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        month: { $month: "$paymentHistory.date" },
                        year: { $year: "$paymentHistory.date" }
                    },
                    total: { $sum: "$paymentHistory.amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const monthlyRevenue = monthlyRevenueRaw.map(item => ({
            label: `${months[item._id.month - 1]}`,
            amount: item.total
        }));

        const paymentMethodsRaw = await Client.aggregate([
            { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
            { $unwind: "$paymentHistory" },
            { $match: { "paymentHistory.date": { $gte: startOfCurrent } } },
            {
                $group: {
                    _id: "$paymentHistory.method",
                    total: { $sum: "$paymentHistory.amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const paymentMethods = paymentMethodsRaw.map(p => ({
            method: p._id,
            amount: p.total,
            count: p.count
        }));

        const recentTransactions = await Client.aggregate([
            { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
            { $unwind: "$paymentHistory" },
            { $sort: { "paymentHistory.date": -1 } },
            { $limit: 20 },
            {
                $project: {
                    clientName: "$name",
                    amount: "$paymentHistory.amount",
                    date: "$paymentHistory.date",
                    method: "$paymentHistory.method",
                    remarks: "$paymentHistory.remarks"
                }
            }
        ]);

        return reply.send({
            success: true,
            data: {
                monthlyRevenue,
                paymentMethods,
                recentTransactions
            }
        });

    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
