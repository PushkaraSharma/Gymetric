import Activity from "../models/Activity.js";
import Client from "../models/Client.js";
import mongoose from "mongoose";
import { addUtcDays, utcStartOfDay, utcStartOfMonth } from "../utils/Helper.js";

const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

export const getDashboardSummary = async (request, reply) => {
    try {
        const { gymId } = request.user;
        const today = utcStartOfDay();
        // Current Month (MTD)
        const startOfCurrent = utcStartOfMonth(today);

        // Previous Month (MTD) - e.g., if today is Jan 19, this is Dec 1 to Dec 19
        const startOfLast = utcStartOfMonth(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));

        const endOfLastMTD = addUtcDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, today.getUTCDate())), 0);

        // Snapshot - Exactly 30 days ago
        const thirtyDaysAgo = addUtcDays(today, -30);

        const [totalClients, activeCount, activeCount30DaysAgo, expiringSoon, revenueCurrent, revenueLastMTD, newlyJoinedCurrent, newlyJoinedLastMTD, recentActivities] = await Promise.all([
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
            Client.countDocuments({
                gymId,
                membershipStatus: 'active',
                currentEndDate: { $gte: today, $lte: addUtcDays(today, 7) },
                upcomingMembership: null
            }),

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
                membershipStatus: 'active',
                'activeMembership.startDate': { $gte: startOfCurrent },
                'activeMembership.status': { $ne: 'trial' }
            }),

            // Newly Joined (Last Month MTD)
            Client.countDocuments({
                gymId,
                membershipStatus: 'active',
                'activeMembership.startDate': { $gte: startOfLast, $lte: endOfLastMTD },
                'activeMembership.status': { $ne: 'trial' }
            }),

            //fetch recent activities
            Activity.find({ gymId }).sort({ date: -1 }).limit(10).lean()
        ]);

        const revCurrentVal = revenueCurrent[0]?.total || 0;
        const revLastVal = revenueLastMTD[0]?.total || 0;

        return reply.send({
            success: true,
            data: {
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
            }
        });
    } catch (error) {
        console.log(error)
        return reply.status(500).send({ success: false, error: error.message });
    }
};