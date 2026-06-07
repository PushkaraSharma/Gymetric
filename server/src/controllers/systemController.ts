import { FastifyRequest, FastifyReply } from 'fastify';
import Client from '../models/Client.js';
import Activity from '../models/Activity.js';
import AssignedMembership from "../models/AssignedMembership.js";
import Settings from "../models/Settings.js";
import Gym from "../models/Gym.js";
import { getISTMidnightToday, formatShortDate } from "../utils/timeUtils.js";
import { sendWhatsAppTemplate } from "../services/Whatsapp.js";
import { sendExpoPush } from "../services/pushNotificationService.js";
import { invalidateClientCachesMany } from "../utils/cache.js";
import User from "../models/User.js";
import dayjs from "dayjs";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const performExpiryChecks = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { secret } = request.body as { secret: string };
        if (secret !== process.env.CRON_SECRET) {
            return reply.status(401).send({ success: false, message: 'Unauthorized' });
        }

        const today = getISTMidnightToday();
        console.log('Running Daily Membership Expiry Check...', today);
        const affectedGymIds = new Set<string>();

        // STEP 1: PROMOTE UPCOMING MEMBERSHIPS STARTING TODAY
        const clientsReadyForPromotion = await Client.find({
            upcomingMembership: { $ne: null }
        }).populate('upcomingMembership');

        for (const client of clientsReadyForPromotion) {
            const upcomingMemb: any = client.upcomingMembership;
            if (upcomingMemb && new Date(upcomingMemb.startDate) <= today) {
                upcomingMemb.status = 'active';
                await upcomingMemb.save();

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
                    date: new Date(),
                });
                affectedGymIds.add(String(client.gymId));
            }
        }

        // STEP 2: HANDLE EXPIRIES
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
                    {
                        _id: { $in: memb.memberIds },
                        activeMembership: memb._id
                    },
                    { $set: { membershipStatus: newStatus } }
                );
                affectedGymIds.add(String(memb.gymId));

                const primaryMember = await Client.findById(memb.primaryMemberId).select('name phoneNumber activeMembership');

                if (primaryMember && String(primaryMember.activeMembership) !== String(memb._id)) {
                    continue;
                }

                await Activity.create({
                    gymId: memb.gymId,
                    type: 'EXPIRY',
                    title: newStatus === 'trial_expired' ? 'Trial Ended' : 'Membership Expired',
                    description: `Membership for ${primaryMember?.name || 'Member'} has ended.`,
                    memberId: memb.primaryMemberId,
                    date: new Date(),
                });

                if (primaryMember?.phoneNumber) {
                    const settings = await Settings.findOne({ gymId: memb.gymId });
                    if (settings?.whatsapp?.active && settings?.whatsapp?.sendOnExpiry !== false) {
                        const gym = await Gym.findById(memb.gymId);
                        const templateName = "expired";
                        const params = [primaryMember.name, gym?.name, formatShortDate(memb.endDate)];
                        await sendWhatsAppTemplate(`91${primaryMember.phoneNumber}`, templateName, params, settings.whatsapp, gym?.name, { gymId: String(memb.gymId), clientId: String(primaryMember._id) });
                    }
                }
            }
        }

        // STEP 3: SEND REMINDERS (Upcoming Expiries)
        const allSettings = await Settings.find({
            'whatsapp.active': true,
            'whatsapp.sendOnReminder': { $ne: false }
        });
        for (const setting of allSettings) {
            const reminderDays = setting.whatsapp.reminderDays || 3;
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

                    if (plan?.durationInMonths <= 0) continue;
                    if (primaryMember?.upcomingMembership) continue;

                    if (primaryMember?.phoneNumber) {
                        const remainingDays = dayjs(memb.endDate).diff(today, 'day');
                        const templateName = "renewal";
                        const params = [primaryMember.name, gym?.name, remainingDays, formatShortDate(memb.endDate)];
                        await sendWhatsAppTemplate(`91${primaryMember.phoneNumber}`, templateName, params, setting.whatsapp, gym?.name, { gymId: String(setting.gymId), clientId: String(primaryMember._id) });
                    }
                }
            }
        }

        if (affectedGymIds.size > 0) {
            invalidateClientCachesMany(affectedGymIds);
            console.log(`Invalidated client caches for ${affectedGymIds.size} gym(s)`);
        }

        return reply.status(200).send({ success: true, data: { message: 'Expiry check completed successfully' } });
    } catch (error: any) {
        console.error('CRON Error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const performPushSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { secret } = request.body as { secret: string };
        if (secret !== process.env.CRON_SECRET) {
            return reply.status(401).send({ success: false, message: 'Unauthorized' });
        }

        const today = getISTMidnightToday();
        console.log('Running Daily Push Summary...', today);

        const gymIds = await Client.distinct('gymId');
        let notificationsSent = 0;

        for (const gymId of gymIds) {
            const owners = await User.find({
                gymId,
                expoPushToken: { $exists: true, $ne: null },
                pushNotificationsEnabled: { $ne: false },
            });

            if (owners.length === 0) continue;

            const [expiringTodayCount, outstandingAgg, expiringSoonCount] = await Promise.all([
                Client.aggregate([
                    { $match: { gymId, membershipStatus: 'active' } },
                    { $lookup: { from: 'assignedmemberships', localField: 'activeMembership', foreignField: '_id', as: 'plan' } },
                    { $unwind: '$plan' },
                    { $match: { 'plan.endDate': { $gte: today, $lt: dayjs(today).add(1, 'day').toDate() } } },
                    { $count: 'count' },
                ]),
                Client.aggregate([
                    { $match: { gymId, balance: { $gt: 0 } } },
                    { $group: { _id: null, total: { $sum: '$balance' }, count: { $sum: 1 } } },
                ]),
                Client.aggregate([
                    { $match: { gymId, membershipStatus: 'active', upcomingMembership: null } },
                    { $lookup: { from: 'assignedmemberships', localField: 'activeMembership', foreignField: '_id', as: 'plan' } },
                    { $unwind: '$plan' },
                    { $match: { 'plan.endDate': { $gte: today, $lte: dayjs(today).add(7, 'day').endOf('day').toDate() } } },
                    { $count: 'count' },
                ]),
            ]);

            const expToday = expiringTodayCount[0]?.count || 0;
            const outstanding = outstandingAgg[0]?.total || 0;
            const balanceClients = outstandingAgg[0]?.count || 0;
            const expSoon = expiringSoonCount[0]?.count || 0;

            const alerts: { prefKey: string; title: string; body: string }[] = [];
            if (expToday > 0) {
                alerts.push({
                    prefKey: 'expiringToday',
                    title: 'Expiring Today',
                    body: `${expToday} membership${expToday > 1 ? 's' : ''} expiring today`,
                });
            }
            if (expSoon > 0) {
                alerts.push({
                    prefKey: 'expiringSoon',
                    title: 'Expiring Soon',
                    body: `${expSoon} membership${expSoon > 1 ? 's' : ''} expiring in the next 7 days`,
                });
            }
            if (outstanding > 0) {
                alerts.push({
                    prefKey: 'outstandingBalance',
                    title: 'Outstanding Balance',
                    body: `₹${outstanding} outstanding from ${balanceClients} client${balanceClients > 1 ? 's' : ''}`,
                });
            }

            if (alerts.length === 0) continue;

            for (const owner of owners) {
                if (!owner.expoPushToken) continue;
                const prefs = owner.pushPrefs || {};

                for (const alert of alerts) {
                    if (prefs.dailySummary === false) continue;
                    if (prefs[alert.prefKey as keyof typeof prefs] === false) continue;

                    await sendExpoPush(owner.expoPushToken, alert.title, alert.body, { screen: 'Home' });
                    notificationsSent++;
                    await sleep(1500);
                }
            }
        }

        return reply.status(200).send({ success: true, data: { message: 'Push summary completed', notificationsSent } });
    } catch (error: any) {
        console.error('Push Summary Error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
