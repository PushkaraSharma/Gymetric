import mongoose from "mongoose";
import Client from "../models/Client.js";

export const getDashboardSummary = async (request, reply) => {
    try {
        const { gymId } = request.user;
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const [totalClients, activeCount, expiringSoon, monthlyRevenue] = await Promise.all([
            Client.countDocuments({ gymId }),
            Client.countDocuments({ gymId, membershipStatus: 'active' }),
            Client.countDocuments({
                gymId,
                membershipStatus: 'active',
                endDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // Next 7 days
            }),
            Client.aggregate([
                { $match: { gymId: new mongoose.Types.ObjectId(gymId) } },
                { $unwind: "$paymentHistory" },
                { $match: { "paymentHistory.date": { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } }
            ])
        ]);
        return reply.send({
            success: true,
            data: {
                totalClients,
                activeMembers: activeCount,
                expiringIn7Days: expiringSoon,
                revenueThisMonth: monthlyRevenue[0]?.total || 0
            }
        });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};