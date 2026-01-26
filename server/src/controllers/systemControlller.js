import Client from '../models/Client.js';
import Activity from '../models/Activity.js';
import AssignedMembership from "../models/AssignedMembership.js";

export const performExpiryChecks = async (request, reply) => {
    try {
        const { secret } = request.body;
        if (secret !== process.env.CRON_SECRET) {
            return reply.status(401).send({ success: false, message: 'Unauthorized' });
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        console.log('Running Daily Membership Expiry Check...');

        // REFINED STEP 1: PROMOTE ANY INDIVIDUAL WHO HAS AN UPCOMING PLAN STARTING TODAY
        const clientsReadyForPromotion = await Client.find({
            upcomingMembership: { $ne: null },
            membershipStatus: { $in: ['expired', 'active'] } // We can also check if their current membership is expiring today
        });

        for (const client of clientsReadyForPromotion) {
            const upcomingMemb = await AssignedMembership.findById(client.upcomingMembership);
            if (upcomingMemb && new Date(upcomingMemb.startDate) <= today) {
                // 1. Promote the Membership Document to Active (if not already done by another member)
                upcomingMemb.status = 'active';
                await upcomingMemb.save();

                // 2. Promote the Client
                client.activeMembership = upcomingMemb._id;
                client.membershipStatus = 'active';
                client.upcomingMembership = null;
                await client.save();

                await Activity.create({
                    gymId: client.gymId,
                    type: 'RENEWAL',
                    title: 'Membership Activated',
                    description: client.role === 'primary'
                        ? `${client.name}'s renewed ${upcomingMemb.planName} plan is now active.`
                        : `${client.name}'s membership has been activated via ${upcomingMemb.planName}.`,
                    memberId: client._id,
                    date: today
                });
            }
        }

        // 2. HANDLE PURE EXPIRIES (No Upcoming Plan)
        const membershipsToExpire = await AssignedMembership.find({
            endDate: { $lt: today },
            status: { $in: ['active', 'trial'] }
        });

        if (membershipsToExpire.length > 0) {
            for (const memb of membershipsToExpire) {
                const newStatus = memb.status === 'trial' ? 'trial_expired' : 'expired';
                memb.status = newStatus;
                await memb.save();
                await Client.updateMany(
                    { _id: { $in: memb.memberIds } },
                    { $set: { membershipStatus: newStatus } }
                );
                await Activity.create({
                    gymId: memb.gymId,
                    type: 'EXPIRY',
                    title: newStatus === 'trial_expired' ? 'Trial Ended' : 'Membership Expired',
                    description: `Group membership led by member ID ${memb.primaryMemberId} has ended.`,
                    memberId: memb.primaryMemberId
                });
            }
        }

        // 3. WAKE UP "FUTURE" MEMBERSHIPS STARTING TODAY
        const startingToday = await AssignedMembership.find({
            startDate: { $lte: today },
            status: 'future'
        });

        for (const memb of startingToday) {
            memb.status = 'active';
            await memb.save();

            await Client.updateMany(
                { _id: { $in: memb.memberIds } },
                { $set: { membershipStatus: 'active' } }
            );
        }
        console.log('Expiry check completed.');
        return reply.status(200).send({ success: true, data: { message: 'Cron job executed' } });
    } catch (error) {
        console.log(error)
        return reply.status(500).send({ success: false, error: error.message });
    }
};