import { FastifyRequest, FastifyReply } from 'fastify';
import Client from '../models/Client.js';
import Activity from '../models/Activity.js';
import AssignedMembership from "../models/AssignedMembership.js";
import Settings from "../models/Settings.js";
import Gym from "../models/Gym.js";
import { getISTMidnightToday, formatShortDate } from "../utils/timeUtils.js";
import { sendWhatsAppTemplate } from "../services/Whatsapp.js";
import dayjs from "dayjs";

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
                const primaryMember = await Client.findById(memb.primaryMemberId).select('name phoneNumber');
                await Activity.create({
                    gymId: memb.gymId,
                    type: 'EXPIRY',
                    title: newStatus === 'trial_expired' ? 'Trial Ended' : 'Membership Expired',
                    description: `Membership for ${primaryMember?.name || 'Member'} has ended.`,
                    memberId: memb.primaryMemberId,
                    date: today
                });

                // Send WhatsApp Notification (Expired)
                if (primaryMember?.phoneNumber) {
                    const settings = await Settings.findOne({ gymId: memb.gymId });
                    if (settings?.whatsapp?.active && settings?.whatsapp?.sendOnExpiry !== false) {
                        const gym = await Gym.findById(memb.gymId);
                        const templateName = "expired";
                        const params = [primaryMember.name, gym?.name, formatShortDate(memb.endDate)];
                        await sendWhatsAppTemplate(`91${primaryMember.phoneNumber}`, templateName, params, settings.whatsapp, gym?.name);
                    }
                }
            }
        }

        // STEP 3: SEND REMINDERS (Upcoming Expiries)
        // Find settings where WhatsApp is active AND reminders are enabled (default true)
        const allSettings = await Settings.find({
            'whatsapp.active': true,
            'whatsapp.sendOnReminder': { $ne: false }
        });
        for (const setting of allSettings) {
            const reminderDays = setting.whatsapp.reminderDays || 3;
            // Target date is 'reminderDays' from today
            // e.g., if today is Jan 30, and reminder is 3 days, we check for Feb 2
            const targetDateStart = dayjs(today).add(reminderDays, 'day').startOf('day').toDate();
            const targetDateEnd = dayjs(today).add(reminderDays, 'day').endOf('day').toDate();
            const expiringMemberships = await AssignedMembership.find({
                gymId: setting.gymId,
                status: { $in: ['active', 'trial'] },
                endDate: { $gte: targetDateStart, $lte: targetDateEnd }
            }).populate('primaryMemberId').populate('planId');

            if (expiringMemberships.length > 0) {
                const gym = await Gym.findById(setting.gymId);
                for (const memb of expiringMemberships) {
                    const primaryMember: any = memb.primaryMemberId;
                    const plan: any = memb.planId;

                    // Condition 1: Only for memberships defined in months (exclude daily passes)
                    if (plan?.durationInMonths <= 0) continue;

                    // Condition 2: Don't send if they already have an upcoming membership set
                    if (primaryMember?.upcomingMembership) continue;

                    if (primaryMember?.phoneNumber) {
                        const remainingDays = dayjs(memb.endDate).diff(today, 'day');
                        const templateName = "renewal";
                        const params = [primaryMember.name, gym?.name, remainingDays, formatShortDate(memb.endDate)];
                        await sendWhatsAppTemplate(`91${primaryMember.phoneNumber}`, templateName, params, setting.whatsapp, gym?.name);
                    }
                }
            }
        }

        return reply.status(200).send({ success: true, data: { message: 'Expiry check completed successfully' } });
    } catch (error: any) {
        console.error('CRON Error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};