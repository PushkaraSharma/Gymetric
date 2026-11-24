import { FastifyRequest, FastifyReply } from 'fastify';
import dayjs from "dayjs";
import { and, count, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { activities, branchSettings, memberships, membershipMembers, members, users } from '../db/schema.js';
import { findBranch, findMember, findPackage, findSettings } from '../db/queries.js';
import { whatsappConfig } from '../db/serializers.js';
import { getISTMidnightToday, formatShortDate } from "../utils/timeUtils.js";
import { sendWhatsAppTemplate } from "../services/Whatsapp.js";
import { sendExpoPush } from "../services/pushNotificationService.js";
import { invalidateClientCachesMany } from "../utils/cache.js";
import { syncMembershipDoor } from "../services/biometric.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Replaces the 180-day TTL index the Mongo Activity collection had.
const ACTIVITY_RETENTION_DAYS = 180;

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
        const readyForPromotion = await db
            .select({ client: members, upcoming: memberships })
            .from(members)
            .innerJoin(memberships, eq(memberships.id, members.upcomingMembershipId))
            .where(lte(memberships.startDate, today));

        for (const { client, upcoming } of readyForPromotion) {
            await db.transaction(async (tx) => {
                await tx.update(memberships).set({ status: 'active', updatedAt: new Date() }).where(eq(memberships.id, upcoming.id));
                await tx.update(members).set({
                    activeMembershipId: upcoming.id,
                    membershipStatus: 'active',
                    upcomingMembershipId: null,
                    updatedAt: new Date(),
                }).where(eq(members.id, client.id));
                await tx.insert(activities).values({
                    branchId: client.branchId,
                    type: 'RENEWAL',
                    title: 'Membership Activated',
                    description: `${client.name}'s plan ${upcoming.planName} is now active.`,
                    memberId: client.id,
                    date: new Date(),
                });
            });
            affectedGymIds.add(client.branchId);
        }

        // STEP 2: HANDLE EXPIRIES
        const membershipsToExpire = await db.select().from(memberships)
            .where(and(lt(memberships.endDate, today), inArray(memberships.status, ['active', 'trial'])));

        for (const memb of membershipsToExpire) {
            const newStatus = memb.status === 'trial' ? 'trial_expired' : 'expired';

            await db.update(memberships).set({ status: newStatus, updatedAt: new Date() }).where(eq(memberships.id, memb.id));

            const onPlan = db.select({ id: membershipMembers.memberId }).from(membershipMembers)
                .where(eq(membershipMembers.membershipId, memb.id));
            await db.update(members)
                .set({ membershipStatus: newStatus, updatedAt: new Date() })
                .where(and(inArray(members.id, onPlan), eq(members.activeMembershipId, memb.id)));
            await syncMembershipDoor(memb.id);
            affectedGymIds.add(memb.branchId);

            const primaryMember = await findMember(db, memb.primaryMemberId);

            if (primaryMember && primaryMember.activeMembershipId !== memb.id) {
                continue;
            }

            await db.insert(activities).values({
                branchId: memb.branchId,
                type: 'EXPIRY',
                title: newStatus === 'trial_expired' ? 'Trial Ended' : 'Membership Expired',
                description: `Membership for ${primaryMember?.name || 'Member'} has ended.`,
                memberId: memb.primaryMemberId,
                date: new Date(),
            });

            if (primaryMember?.phoneNumber) {
                const settings = await findSettings(db, memb.branchId);
                if (settings?.whatsappActive && settings.whatsappSendOnExpiry !== false) {
                    const gym = await findBranch(db, memb.branchId);
                    const params = [primaryMember.name, gym?.name, formatShortDate(memb.endDate)];
                    await sendWhatsAppTemplate(`91${primaryMember.phoneNumber}`, "expired", params, whatsappConfig(settings), gym?.name, { gymId: memb.branchId, clientId: primaryMember.id });
                }
            }
        }

        // STEP 3: SEND REMINDERS (Upcoming Expiries)
        const allSettings = await db.select().from(branchSettings)
            .where(and(eq(branchSettings.whatsappActive, true), eq(branchSettings.whatsappSendOnReminder, true)));
        for (const setting of allSettings) {
            const reminderDays = setting.whatsappReminderDays || 1;
            const targetDateStart = dayjs(today).add(reminderDays, 'day').startOf('day').toDate();
            const targetDateEnd = dayjs(today).add(reminderDays, 'day').endOf('day').toDate();
            const expiringMemberships = await db.select().from(memberships).where(and(
                eq(memberships.branchId, setting.branchId),
                inArray(memberships.status, ['active', 'trial']),
                gte(memberships.endDate, targetDateStart),
                lte(memberships.endDate, targetDateEnd),
            ));

            if (expiringMemberships.length > 0) {
                const gym = await findBranch(db, setting.branchId);
                for (const memb of expiringMemberships) {
                    const [primaryMember, plan] = await Promise.all([
                        findMember(db, memb.primaryMemberId),
                        findPackage(db, memb.packageId),
                    ]);

                    if (plan && plan.durationInMonths <= 0) continue;
                    if (primaryMember?.upcomingMembershipId) continue;

                    if (primaryMember?.phoneNumber) {
                        const remainingDays = dayjs(memb.endDate).diff(today, 'day');
                        const params = [primaryMember.name, gym?.name, remainingDays, formatShortDate(memb.endDate)];
                        await sendWhatsAppTemplate(`91${primaryMember.phoneNumber}`, "renewal", params, whatsappConfig(setting), gym?.name, { gymId: setting.branchId, clientId: primaryMember.id });
                    }
                }
            }
        }

        // STEP 4: PRUNE OLD ACTIVITY
        await db.delete(activities).where(lt(activities.date, dayjs().subtract(ACTIVITY_RETENTION_DAYS, 'day').toDate()));

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

        const gymIds = (await db.selectDistinct({ id: members.branchId }).from(members)).map((r) => r.id);
        let notificationsSent = 0;

        for (const gymId of gymIds) {
            const owners = await db.select().from(users).where(and(
                eq(users.branchId, gymId),
                isNotNull(users.expoPushToken),
                eq(users.pushNotificationsEnabled, true),
            ));

            if (owners.length === 0) continue;

            const activeEnding = (to: ReturnType<typeof lt>) => and(
                eq(members.branchId, gymId),
                eq(members.membershipStatus, 'active'),
                gte(memberships.endDate, today),
                to,
            );
            const [[{ value: expToday }], [outstandingAgg], [{ value: expSoon }]] = await Promise.all([
                db.select({ value: count() }).from(members)
                    .innerJoin(memberships, eq(memberships.id, members.activeMembershipId))
                    .where(activeEnding(lt(memberships.endDate, dayjs(today).add(1, 'day').toDate()))),
                db.select({ total: sql<number>`coalesce(sum(${members.balance}), 0)`.mapWith(Number), count: count() })
                    .from(members)
                    .where(and(eq(members.branchId, gymId), gt(members.balance, 0))),
                db.select({ value: count() }).from(members)
                    .innerJoin(memberships, eq(memberships.id, members.activeMembershipId))
                    .where(and(
                        activeEnding(lte(memberships.endDate, dayjs(today).add(7, 'day').endOf('day').toDate())),
                        isNull(members.upcomingMembershipId),
                    )),
            ]);

            const outstanding = outstandingAgg?.total || 0;
            const balanceClients = outstandingAgg?.count || 0;

            const alerts: { prefKey: 'expiringToday' | 'expiringSoon' | 'outstandingBalance'; title: string; body: string }[] = [];
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
                const prefs = {
                    expiringToday: owner.pushExpiringToday,
                    expiringSoon: owner.pushExpiringSoon,
                    outstandingBalance: owner.pushOutstandingBalance,
                    dailySummary: owner.pushDailySummary,
                };

                for (const alert of alerts) {
                    if (prefs.dailySummary === false) continue;
                    if (prefs[alert.prefKey] === false) continue;

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
