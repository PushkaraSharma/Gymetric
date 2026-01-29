import { FastifyRequest, FastifyReply } from 'fastify';
import Client from '../models/Client.js';
import Activity from '../models/Activity.js';
import AssignedMembership from "../models/AssignedMembership.js";
import { getISTMidnightToday } from "../utils/timeUtils.js";

export const performExpiryChecks = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { secret } = request.body as { secret: string };
        if (secret !== process.env.CRON_SECRET) {
            return reply.status(401).send({ success: false, message: 'Unauthorized' });
        }

        const today = getISTMidnightToday();
        console.log('Running Daily Membership Expiry Check...', today);

        // STEP 1: PROMOTE UPCOMING MEMBERSHIPS STARTING TODAY
        // We find all clients who have an upcoming membership that starts today or earlier
        const clientsReadyForPromotion = await Client.find({
            upcomingMembership: { $ne: null },
            membershipStatus: { $in: ['expired', 'active', 'future'] }
        }).populate('upcomingMembership');

        for (const client of clientsReadyForPromotion) {
            const upcomingMemb: any = client.upcomingMembership;
            if (upcomingMemb && new Date(upcomingMemb.startDate) <= today) {
                // 1. Promote Membership to Active
                upcomingMemb.status = 'active';
                await upcomingMemb.save();

                // 2. Promote the Client
                client.activeMembership = upcomingMemb._id;
                client.membershipStatus = 'active';
                client.upcomingMembership = undefined;
                await client.save();

                await Activity.create({
                    gymId: client.gymId,
                    type: 'RENEWAL',
                    title: 'Membership Activated',
                    description: `${client.name}'s plan ${upcomingMemb.planName} is now active.`,
                    memberId: client._id,
                    date: today
                });
            }
        }

        // STEP 2: HANDLE EXPIRIES
        // Find memberships that ended before today and are still marked 'active' or 'trial'
        const membershipsToExpire = await AssignedMembership.find({
            endDate: { $lt: today },
            status: { $in: ['active', 'trial'] }
        });

        if (membershipsToExpire.length > 0) {
            for (const memb of membershipsToExpire) {
                const newStatus = memb.status === 'trial' ? 'trial_expired' : 'expired';

                // Update Membership Status
                memb.status = newStatus;
                await memb.save();

                // Update all members belonging to this membership
                await Client.updateMany(
                    { _id: { $in: memb.memberIds } },
                    { $set: { membershipStatus: newStatus } }
                );

                // Log Activity
                const primaryMember = await Client.findById(memb.primaryMemberId).select('name');
                await Activity.create({
                    gymId: memb.gymId,
                    type: 'EXPIRY',
                    title: newStatus === 'trial_expired' ? 'Trial Ended' : 'Membership Expired',
                    description: `Membership for ${primaryMember?.name || 'Member'} has ended.`,
                    memberId: memb.primaryMemberId,
                    date: today
                });
            }
        }

        return reply.status(200).send({ success: true, data: { message: 'Expiry check completed successfully' } });
    } catch (error: any) {
        console.error('CRON Error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};