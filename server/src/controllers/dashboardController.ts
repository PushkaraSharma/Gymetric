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

export const getDashboardSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const cacheKey = getCacheKey('dashboard_summary', gymId);

        // Check if data is stored in the cache
        const cachedSummary = cache.get(cacheKey);
        if (cachedSummary) {
            return reply.send({ success: true, data: cachedSummary });
        }

        const today = utcStartOfDay();
        // Current Month (MTD)
        const startOfCurrent = utcStartOfMonth(today);

        // Previous Month (MTD) - e.g., if today is Jan 19, this is Dec 1 to Dec 19
        const startOfLast = utcStartOfMonth(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));

        const endOfLastMTD = addUtcDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, today.getUTCDate())), 0);

        // Snapshot - Exactly 30 days ago
        const thirtyDaysAgo = addUtcDays(today, -30);

        const [totalClients, activeCount, activeCount30DaysAgo, expiringSoonParams, revenueCurrent, revenueLastMTD, newlyJoinedCurrent, newlyJoinedLastMTD, recentActivities] = await Promise.all([
            // Total Lifetime Clients
            Client.countDocuments({ gymId }),

            // Current Active
            Client.countDocuments({ gymId, membershipStatus: 'active' }),

            // Active 30 Days Ago (For Snapshot Trend)
            Client.countDocuments({
                gymId,
                membershipStatus: 'active',
                createdAt: { $lte: thirtyDaysAgo } // Approximation based on creation
            }),

            // Expiring Soon (Actionable: No upcoming plan)
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
                        'activePlan.endDate': { $gte: today, $lte: addUtcDays(today, 7) }
                    }
                },
                { $count: 'count' }
            ]),

            // Current Revenue (MTD)
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: startOfCurrent } } },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } }
            ]),

            // Last Month Revenue (MTD)
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: startOfLast, $lte: endOfLastMTD } } },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } }
            ]),

            // Newly Joined (Current MTD)
            Client.countDocuments({
                gymId,
                createdAt: { $gte: startOfCurrent }
            }),

            // Newly Joined (Last Month MTD)
            Client.countDocuments({
                gymId,
                createdAt: { $gte: startOfLast, $lte: endOfLastMTD }
            }),

            //fetch recent activities
            Activity.find({ gymId }).sort({ date: -1 }).limit(10).lean()
        ]);

        const revCurrentVal = revenueCurrent[0]?.total || 0;
        const revLastVal = revenueLastMTD[0]?.total || 0;
        const expiringSoon = expiringSoonParams[0]?.count || 0;

        const responseData = {
            totalClients,
            activeMembers: {
                value: activeCount,
                trend: calculateTrend(activeCount, activeCount30DaysAgo),
                comparisonText: "vs 30 days ago"
            },
            expiringIn7Days: expiringSoon,
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

        // Save result to cache (automatically expires after stdTTL defined in cache.ts)
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

        // 1. Monthly Revenue (Last 6 months)
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        sixMonthsAgo.setDate(1); // Start of month 6 months ago

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

        // Fill gaps if any months are missing (optional, but good for charts)
        // For simplicity, we just map what we have, or we can construct a full 6-month array.
        // Let's just return what we have for now, effectively.
        const monthlyRevenue = monthlyRevenueRaw.map(item => ({
            label: `${months[item._id.month - 1]}`,
            amount: item.total
        }));


        // 2. Payment Method Breakdown (This Month)
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

        // 3. Recent Transactions (Last 20)
        // We need to unwind and sort, which can be heavy if many clients. 
        // Better to limit match first if possible.
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