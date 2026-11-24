import { FastifyRequest, FastifyReply } from 'fastify';
import { and, count, desc, eq, gt, inArray, isNotNull, max, sql } from 'drizzle-orm';
import { db, type Executor } from '../db/client.js';
import { activities, attendance, biometricDevices, deviceEnrollments, memberships, membershipMembers, membershipPauses, members, messageLogs, packages, payments } from '../db/schema.js';
import { can } from '../services/access.js';
import {
    addMembershipMember,
    findBranch,
    findMember,
    findMembership,
    findPackage,
    findSettings,
    memberDoc,
    memberIdsFor,
    membershipDoc,
    pausesFor,
    paymentHistoryFor,
} from '../db/queries.js';
import { compact, serializeMember, serializeMembership, whatsappConfig, type MemberRow } from '../db/serializers.js';
import { sendWhatsAppTemplate, logSkippedWhatsApp } from "../services/Whatsapp.js";
import {
    getISTMidnightToday,
    getNowIST,
    parseToISTMidnight,
    calculateMembershipExpiry,
    formatShortDate,
    formatDisplayDate,
    addUtcDays,
} from "../utils/timeUtils.js";
import {
    validateMembershipStartDate,
    validateMembershipNotExpiredOnCreate,
    resolveAmountReceived,
} from "../utils/membershipValidation.js";
import { syncMembersForMembership, getMembershipStatusFromDates } from "../utils/membershipHelpers.js";
import { deleteMemberFromDevice, syncMemberDoor, syncMembershipDoor } from "../services/biometric.js";
import { STALE_WHATSAPP_SKIP_DAYS } from "../utils/Constants.js";
import { cache, getCacheKey, invalidateClientCaches } from "../utils/cache.js";
import { HttpError } from "../utils/httpError.js";

interface OnboardingBody {
    primaryDetails: any;
    dependents?: any[];
    planId: string;
    method: string;
    paymentReceived?: boolean;
    amountReceived?: number;
    startDate?: string;
    amount: number;
}

interface RenewalBody {
    id: string;
    planId: string;
    startDate: string;
    amount: number;
    method: string;
    paymentReceived?: boolean;
    amountReceived?: number;
    dependents: any[];
}

type MemberInsert = typeof members.$inferInsert;

const ACTIVE_LIKE = ['active', 'trial', 'expired', 'trial_expired'];

const toDate = (value: unknown) => (value === undefined || value === null || value === '' ? undefined : new Date(value as any));
const toInt = (value: unknown) => (value === undefined || value === null || value === '' ? undefined : Math.round(Number(value)));

// Client fields the app may send; anything else in the body is ignored, as the Mongoose schema did.
const memberFields = (details: any = {}): Partial<MemberInsert> => compact({
    name: details.name,
    phoneNumber: details.phoneNumber,
    age: toInt(details.age),
    birthday: toDate(details.birthday),
    anniversaryDate: toDate(details.anniversaryDate),
    onboardingPurpose: details.onboardingPurpose,
    gender: details.gender,
    profilePicture: details.profilePicture,
}) as Partial<MemberInsert>;

const insertMember = async (exec: Executor, gymId: string, details: any, extra: Partial<MemberInsert> = {}) => {
    const [row] = await exec.insert(members).values({
        onboardingPurpose: 'General Fitness',
        ...memberFields(details),
        ...extra,
        name: details?.name,
        phoneNumber: details?.phoneNumber,
        branchId: gymId,
    } as MemberInsert).returning();
    return row;
};

const updateMember = async (exec: Executor, memberId: string, update: Partial<MemberInsert>) => {
    const [row] = await exec.update(members).set({ ...update, updatedAt: new Date() }).where(eq(members.id, memberId)).returning();
    return row;
};

const addActivity = (exec: Executor, values: Omit<typeof activities.$inferInsert, 'branchId'> & { gymId: string }) => {
    const { gymId, ...rest } = values;
    return exec.insert(activities).values({ ...rest, branchId: gymId });
};

// Adds the unpaid part of a sale to the balance and records what was received.
const applyPayment = async (
    exec: Executor,
    client: MemberRow,
    totalAmount: number,
    amountReceived: number,
    method: string,
    membershipId: string,
    collectedByUserId?: string,
) => {
    const balanceDue = totalAmount - amountReceived;
    const updated = await updateMember(exec, client.id, { balance: (client.balance || 0) + balanceDue });

    if (amountReceived > 0) {
        const remarks = balanceDue > 0
            ? `Partial payment (₹${amountReceived} of ₹${totalAmount})`
            : 'Membership';
        await exec.insert(payments).values({
            branchId: client.branchId,
            memberId: client.id,
            membershipId,
            amount: amountReceived,
            method,
            paidAt: new Date(),
            type: 'membership',
            remarks,
            collectedByUserId,
        });
    }
    return updated;
};

const sendError = (request: FastifyRequest, reply: FastifyReply, error: any, label?: string) => {
    if (error instanceof HttpError) return reply.status(error.status).send(error.body);
    request.log.error(label ? { err: error } : error, label);
    return reply.status(500).send({ success: false, error: error.message });
};

// Last visit and fingerprint state change on every door punch, so they stay out of the cached list.
const liveClientFields = async (gymId: string) => {
    const [visits, enrollments] = await Promise.all([
        db.select({ memberId: attendance.memberId, last: max(attendance.punchedAt) }).from(attendance)
            .where(and(eq(attendance.branchId, gymId), eq(attendance.status, 'granted'), isNotNull(attendance.memberId)))
            .groupBy(attendance.memberId),
        db.select({ memberId: deviceEnrollments.memberId, status: deviceEnrollments.fingerprintStatus }).from(deviceEnrollments)
            .innerJoin(biometricDevices, eq(biometricDevices.id, deviceEnrollments.deviceId))
            .where(and(eq(biometricDevices.branchId, gymId), eq(biometricDevices.isActive, true), isNotNull(deviceEnrollments.memberId))),
    ]);
    return {
        lastCheckin: new Map(visits.map((v) => [v.memberId as string, v.last])),
        fingerprint: new Map(enrollments.map((e) => [e.memberId as string, e.status])),
    };
};

export const getAllClients = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const cacheKey = getCacheKey('client_list', gymId);

        let clients = cache.get(cacheKey) as Record<string, any>[] | undefined;
        if (!clients) {
            const rows = await db
                .select({ member: members, membership: memberships, planType: packages.planType })
                .from(members)
                .leftJoin(memberships, eq(memberships.id, members.activeMembershipId))
                .leftJoin(packages, eq(packages.id, memberships.packageId))
                .where(eq(members.branchId, gymId))
                // Mongo sorted names by raw bytes (uppercase before lowercase); "C" collation keeps that order.
                .orderBy(sql`${members.name} collate "C"`);

            const pauses = await pausesFor(db, rows.flatMap((r) => (r.membership ? [r.membership.id] : [])));
            clients = rows.map(({ member, membership, planType }) => compact({
                _id: member.id,
                name: member.name,
                phoneNumber: member.phoneNumber,
                gender: member.gender,
                membershipStatus: member.membershipStatus,
                activeMembership: membership ? compact({
                    _id: membership.id,
                    startDate: membership.startDate,
                    endDate: membership.endDate,
                    planName: membership.planName,
                    planType: planType ?? undefined,
                    status: membership.status,
                    pauseHistory: (pauses.get(membership.id) ?? []).map((p) => compact({
                        _id: p.id, startedAt: p.startedAt, endedAt: p.endedAt, days: p.days, reason: p.reason,
                    })),
                    totalPausedDays: membership.totalPausedDays,
                }) : undefined,
                balance: member.balance,
                role: member.role,
                profilePicture: member.profilePicture,
                birthday: member.birthday,
                createdAt: member.createdAt,
            }));
            cache.set(cacheKey, clients);
        }

        const live = await liveClientFields(gymId);
        const data = clients.map((client) => compact({
            ...client,
            lastCheckinAt: live.lastCheckin.get(client._id) ?? undefined,
            fingerprintStatus: live.fingerprint.get(client._id) ?? undefined,
        }));
        return reply.status(200).send({ success: true, data });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const onBoarding = async (request: FastifyRequest<{ Body: OnboardingBody }>, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { primaryDetails, dependents = [], planId, method, paymentReceived, amountReceived, startDate, amount } = request.body;

        const result = await db.transaction(async (tx) => {
            const plan = await findPackage(tx, planId);
            if (!plan) throw new HttpError(404, { success: false, error: "Membership not found" });

            const paymentResult = resolveAmountReceived(amount, amountReceived, paymentReceived);
            if (paymentResult.error) throw new HttpError(400, { success: false, error: paymentResult.error });

            const today = getISTMidnightToday();
            const startDateStr = startDate || today.toISOString().split('T')[0];
            const startValidation = validateMembershipStartDate(startDateStr);
            if (!startValidation.valid) throw new HttpError(400, { success: false, error: startValidation.error });

            const customStartDate = startValidation.date!;
            const expiryValidation = validateMembershipNotExpiredOnCreate(customStartDate, plan.durationInMonths, plan.durationInDays);
            if (!expiryValidation.valid) throw new HttpError(400, { success: false, error: expiryValidation.error });

            const endDate = expiryValidation.endDate!;

            let membershipStatus: string = 'active';
            if (endDate < today) {
                membershipStatus = plan.isTrial ? 'trial_expired' : 'expired';
            } else if (customStartDate > today) {
                membershipStatus = 'future';
            } else if (plan.isTrial) {
                membershipStatus = 'trial';
            }

            const primaryClient = await insertMember(tx, gymId, primaryDetails, { role: 'primary', membershipStatus });

            const [newAssignedMembership] = await tx.insert(memberships).values({
                branchId: gymId,
                primaryMemberId: primaryClient.id,
                packageId: plan.id,
                planName: plan.planName,
                startDate: customStartDate,
                endDate,
                totalAmount: amount,
                status: membershipStatus,
            }).returning();
            await addMembershipMember(tx, newAssignedMembership.id, primaryClient.id);

            const activeRef = ACTIVE_LIKE.includes(membershipStatus) ? newAssignedMembership.id : undefined;
            const upcomingRef = membershipStatus === 'future' ? newAssignedMembership.id : undefined;

            for (const dep of dependents) {
                let depClient: MemberRow | null;
                if (dep.clientId) {
                    const existing = await findMember(tx, dep.clientId, gymId);
                    depClient = existing
                        ? await updateMember(tx, existing.id, compact({
                            role: 'dependent',
                            membershipStatus,
                            activeMembershipId: activeRef,
                            upcomingMembershipId: upcomingRef,
                        }))
                        : null;
                } else {
                    depClient = await insertMember(tx, gymId, dep, {
                        role: 'dependent',
                        membershipStatus,
                        activeMembershipId: activeRef,
                        upcomingMembershipId: upcomingRef,
                    });
                }
                if (depClient) await addMembershipMember(tx, newAssignedMembership.id, depClient.id);
            }

            const withRefs = await updateMember(tx, primaryClient.id, {
                activeMembershipId: activeRef ?? null,
                upcomingMembershipId: upcomingRef ?? null,
            });
            const savedPrimary = await applyPayment(tx, withRefs, amount, paymentResult.received, method, newAssignedMembership.id, userId);

            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'ONBOARDING',
                title: `New member${dependents.length > 0 ? 's' : ''} joined`,
                description: `${primaryClient.name} joined with a ${plan.planName} plan starting ${formatDisplayDate(customStartDate)}${dependents.length > 0 ? ` along with ${dependents.length} members` : ''}`,
                amount: paymentResult.received,
                memberId: primaryClient.id,
                date: new Date(),
            });

            return { primaryClient: savedPrimary, plan, customStartDate, endDate, today };
        });

        const { primaryClient, plan, customStartDate, endDate, today } = result;
        const settings = await findSettings(db, gymId);
        const staleCutoff = addUtcDays(today, -STALE_WHATSAPP_SKIP_DAYS);
        if (settings?.whatsappActive && settings.whatsappSendOnOnboarding !== false) {
            if (customStartDate < staleCutoff) {
                await logSkippedWhatsApp(gymId, primaryClient.id, 'onboarding', 'Skipped: membership start date is older than 7 days');
            } else {
                const gymInfo = await findBranch(db, gymId);
                const params = [primaryClient.name, gymInfo?.name || 'Gym', plan.planName, formatShortDate(customStartDate), formatShortDate(endDate)];
                sendWhatsAppTemplate(`91${primaryClient.phoneNumber}`, "onboarding", params, whatsappConfig(settings), gymInfo?.name, { gymId, clientId: primaryClient.id });
            }
        }

        invalidateClientCaches(gymId);
        return reply.status(201).send({ success: true, data: await memberDoc(db, primaryClient) });
    } catch (error: any) {
        return sendError(request, reply, error, 'Onboarding Error');
    }
};

export const getClientStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const countWhere = async (extra?: any) => {
            const [{ value }] = await db.select({ value: count() }).from(members).where(extra ? and(eq(members.branchId, gymId), extra) : eq(members.branchId, gymId));
            return value;
        };

        const [totalClients, activeMembers, expiredMembers, upcomingMembers, pausedMembers, clientsWithBalance] = await Promise.all([
            countWhere(),
            countWhere(eq(members.membershipStatus, 'active')),
            countWhere(inArray(members.membershipStatus, ['expired', 'trial_expired'])),
            countWhere(eq(members.membershipStatus, 'future')),
            countWhere(eq(members.membershipStatus, 'paused')),
            countWhere(gt(members.balance, 0)),
        ]);

        return reply.send({
            success: true,
            data: {
                totalClients,
                activeMembers,
                expiredMembers,
                upcomingMembers,
                pausedMembers,
                clientsWithBalance,
            }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const renewMembership = async (request: FastifyRequest<{ Body: RenewalBody }>, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { id, planId, startDate, amount, method, paymentReceived, amountReceived, dependents = [] } = request.body;

        const result = await db.transaction(async (tx) => {
            const paymentResult = resolveAmountReceived(amount, amountReceived, paymentReceived);
            if (paymentResult.error) throw new HttpError(400, { success: false, error: paymentResult.error });

            const primaryClient = await findMember(tx, id, gymId);
            const plan = await findPackage(tx, planId);
            if (!primaryClient || !plan) {
                throw new HttpError(404, { success: false, message: `${!primaryClient ? 'Client' : 'Plan'} not found` });
            }

            const startValidation = validateMembershipStartDate(startDate);
            if (!startValidation.valid) throw new HttpError(400, { success: false, error: startValidation.error });

            const today = getISTMidnightToday();
            const newStartDate = startValidation.date!;
            const expiryValidation = validateMembershipNotExpiredOnCreate(newStartDate, plan.durationInMonths, plan.durationInDays);
            if (!expiryValidation.valid) throw new HttpError(400, { success: false, error: expiryValidation.error });

            const newEndDate = expiryValidation.endDate!;
            const status = newEndDate < today
                ? (plan.isTrial ? 'trial_expired' : 'expired')
                : (newStartDate > today ? 'future' : (plan.isTrial ? 'trial' : 'active'));
            const activeLike = ACTIVE_LIKE.includes(status);

            const [renewedMembership] = await tx.insert(memberships).values({
                branchId: gymId,
                primaryMemberId: primaryClient.id,
                packageId: plan.id,
                planName: plan.planName,
                startDate: newStartDate,
                endDate: newEndDate,
                totalAmount: amount,
                status,
            }).returning();
            await addMembershipMember(tx, renewedMembership.id, primaryClient.id);

            for (const dep of dependents) {
                const depClient = dep.clientId
                    ? await findMember(tx, dep.clientId, gymId)
                    : await insertMember(tx, gymId, dep);
                if (!depClient) continue;
                await updateMember(tx, depClient.id, {
                    role: 'dependent',
                    membershipStatus: status,
                    ...(activeLike ? { activeMembershipId: renewedMembership.id } : { upcomingMembershipId: renewedMembership.id }),
                });
                await addMembershipMember(tx, renewedMembership.id, depClient.id);
            }

            let activityType: 'RENEWAL' | 'ADVANCE_RENEWAL' = 'RENEWAL';
            let withRefs: MemberRow;
            if (activeLike) {
                withRefs = await updateMember(tx, primaryClient.id, { membershipStatus: status, activeMembershipId: renewedMembership.id });
            } else {
                activityType = 'ADVANCE_RENEWAL';
                withRefs = await updateMember(tx, primaryClient.id, { upcomingMembershipId: renewedMembership.id });
            }

            const savedPrimary = await applyPayment(tx, withRefs, amount, paymentResult.received, method, renewedMembership.id, userId);

            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: activityType,
                title: activityType === 'RENEWAL' ? 'Membership Renewed' : 'Advance Renewal',
                description: activityType === 'RENEWAL' ?
                    `${primaryClient.name} renewed the ${plan.planName} plan` :
                    `${primaryClient.name} pre-paid for ${plan.planName} starting on ${formatDisplayDate(newStartDate)}`,
                amount: paymentResult.received,
                memberId: primaryClient.id,
                date: new Date(),
            });

            return { primaryClient: savedPrimary, plan, newStartDate, newEndDate, membershipId: renewedMembership.id };
        });

        const { primaryClient, plan, newStartDate, newEndDate, membershipId } = result;
        await syncMembershipDoor(membershipId);
        const settings = await findSettings(db, gymId);
        if (settings?.whatsappActive && settings.whatsappSendOnRenewal !== false) {
            const gymInfo = await findBranch(db, gymId);
            const params = [primaryClient.name, plan.planName, formatShortDate(newStartDate), formatShortDate(newEndDate)];
            sendWhatsAppTemplate(`91${primaryClient.phoneNumber}`, "renewal_complete", params, whatsappConfig(settings), gymInfo?.name, { gymId, clientId: primaryClient.id });
        }

        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: await memberDoc(db, primaryClient) });
    } catch (error: any) {
        return sendError(request, reply, error, 'Renewal Error');
    }
};

export const collectPayment = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { clientId, amount, method, date, remarks } = request.body as any;

        const client = await db.transaction(async (tx) => {
            if (!amount || amount <= 0) throw new HttpError(400, { success: false, error: 'Amount must be greater than 0.' });

            const found = await findMember(tx, clientId, gymId);
            if (!found) throw new HttpError(404, { success: false, error: 'Client not found.' });

            if (amount > found.balance) {
                throw new HttpError(400, { success: false, error: `Amount cannot exceed outstanding balance of ₹${found.balance}.` });
            }

            const paymentDate = date ? new Date(date) : new Date();
            await tx.insert(payments).values({
                branchId: gymId,
                memberId: found.id,
                amount,
                method,
                paidAt: paymentDate,
                remarks: remarks || 'Balance collection',
                type: 'balance_collection',
                collectedByUserId: userId,
            });
            const saved = await updateMember(tx, found.id, { balance: found.balance - amount });

            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'PAYMENT',
                title: 'Balance collected',
                description: `₹${amount} collected from ${found.name}${remarks ? ` — ${remarks}` : ''}`,
                amount,
                memberId: found.id,
                date: paymentDate,
            });
            return saved;
        });

        invalidateClientCaches(gymId);
        await syncMemberDoor(client.id);
        return reply.send({ success: true, data: await memberDoc(db, client) });
    } catch (error: any) {
        return sendError(request, reply, error);
    }
};

// Correcting a recorded payment (CoreWave: PATCH/DELETE /api/members/:id/payments/:paymentId). A payment only
// ever reduces what the client owes, so the balance moves by the change in amount: a smaller or deleted payment
// puts the difference back on the balance. The balance changes with one SQL increment so concurrent edits add up.
const paymentForChange = async (exec: Executor, gymId: string, clientId: unknown, paymentId: unknown) => {
    const client = await findMember(exec, clientId, gymId);
    if (!client) throw new HttpError(404, { success: false, message: 'Client not found' });
    const [payment] = await exec.select().from(payments)
        .where(and(eq(payments.id, String(paymentId)), eq(payments.branchId, gymId), eq(payments.memberId, client.id)))
        .for('update')
        .limit(1);
    if (!payment) throw new HttpError(404, { success: false, message: 'Payment not found' });
    return { client, payment };
};

const moveBalance = (exec: Executor, memberId: string, delta: number) =>
    exec.update(members).set({ balance: sql`${members.balance} + ${delta}`, updatedAt: new Date() })
        .where(eq(members.id, memberId))
        .returning();

const rupees = (value: number | null | undefined) => `₹${(value ?? 0).toLocaleString('en-IN')}`;

export const editPayment = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { id, paymentId } = request.params as { id: string; paymentId: string };
        const body = (request.body ?? {}) as { amount?: number; method?: string; date?: string; reason?: string };
        const amount = Math.round(Number(body.amount));
        const reason = String(body.reason ?? '').trim();
        if (!Number.isFinite(amount) || amount <= 0) return reply.status(400).send({ success: false, message: 'Amount must be more than 0' });
        if (!reason) return reply.status(400).send({ success: false, message: 'Add a reason for the change' });
        const paidAt = body.date ? new Date(body.date) : null;
        if (paidAt && (Number.isNaN(paidAt.getTime()) || paidAt > new Date())) {
            return reply.status(400).send({ success: false, message: 'Pick a payment date that is not in the future' });
        }

        const saved = await db.transaction(async (tx) => {
            const { client, payment } = await paymentForChange(tx, gymId, id, paymentId);
            const delta = (payment.amount ?? 0) - amount;
            if ((client.balance ?? 0) + delta < 0) {
                throw new HttpError(400, { success: false, message: `This is ${rupees(-delta)} more than the client owes` });
            }
            await tx.update(payments).set({
                amount,
                method: body.method || payment.method,
                ...(paidAt ? { paidAt } : {}),
            }).where(eq(payments.id, payment.id));
            const [member] = await moveBalance(tx, client.id, delta);
            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'PAYMENT',
                title: 'Payment edited',
                description: `${rupees(payment.amount)} ${payment.method ?? ''} changed to ${rupees(amount)} ${body.method || payment.method || ''} (${reason})`.replace(/\s+/g, ' '),
                amount,
                memberId: client.id,
                date: new Date(),
            });
            return member;
        });

        invalidateClientCaches(gymId);
        await syncMemberDoor(saved.id);
        return reply.send({ success: true, data: await memberDoc(db, saved) });
    } catch (error: any) {
        return sendError(request, reply, error, 'Edit Payment Error');
    }
};

export const deletePayment = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { id, paymentId } = request.params as { id: string; paymentId: string };
        const reason = String((request.query as { reason?: string })?.reason ?? '').trim();
        if (!reason) return reply.status(400).send({ success: false, message: 'Add a reason for deleting this payment' });

        const saved = await db.transaction(async (tx) => {
            const { client, payment } = await paymentForChange(tx, gymId, id, paymentId);
            await tx.delete(payments).where(eq(payments.id, payment.id));
            const [member] = await moveBalance(tx, client.id, payment.amount ?? 0);
            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'PAYMENT',
                title: 'Payment deleted',
                description: `${rupees(payment.amount)} ${payment.method ?? ''} from ${formatShortDate(payment.paidAt)} removed; added back to the balance (${reason})`.replace(/\s+/g, ' '),
                amount: 0,
                memberId: client.id,
                date: new Date(),
            });
            return member;
        });

        invalidateClientCaches(gymId);
        await syncMemberDoor(saved.id);
        return reply.send({ success: true, data: await memberDoc(db, saved) });
    } catch (error: any) {
        return sendError(request, reply, error, 'Delete Payment Error');
    }
};

// Upgrade keeps the start date and gives the whole price of the current plan as credit,
// so the client pays only the difference. Same plan type and seats; trials cannot be upgraded.
const upgradeContext = async (exec: Executor, gymId: string, clientId: unknown) => {
    const client = await findMember(exec, clientId, gymId);
    if (!client) throw new HttpError(404, { success: false, message: 'Client not found' });
    const current = client.activeMembershipId ? await findMembership(exec, client.activeMembershipId, gymId) : null;
    if (!current || current.status !== 'active' || current.endDate < getISTMidnightToday()) {
        throw new HttpError(400, { success: false, message: 'Only an active membership can be upgraded' });
    }
    if (current.primaryMemberId !== client.id) {
        throw new HttpError(400, { success: false, message: 'Upgrade from the profile of the client who paid for this plan' });
    }
    const currentPackage = current.packageId ? await findPackage(exec, current.packageId) : null;
    const planType = currentPackage?.planType ?? 'indivisual';
    const seats = currentPackage?.membersAllowed ?? 1;
    const credit = current.totalAmount ?? 0;
    const choices = await exec.select().from(packages)
        .where(and(eq(packages.branchId, gymId), eq(packages.active, true), eq(packages.isTrial, false), eq(packages.planType, planType), eq(packages.membersAllowed, seats)))
        .orderBy(packages.sortIndex);
    const options = choices
        .filter((p) => p.id !== current.packageId && p.price > credit)
        .map((p) => ({
            _id: p.id,
            planName: p.planName,
            price: p.price,
            durationInMonths: p.durationInMonths,
            durationInDays: p.durationInDays,
            endDate: calculateMembershipExpiry(current.startDate, p.durationInMonths, p.durationInDays),
            payable: p.price - credit,
        }))
        .filter((p) => p.endDate >= getISTMidnightToday());
    return { client, current, credit, options };
};

export const upgradeOptions = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { clientId } = request.query as { clientId?: string };
        let context: Awaited<ReturnType<typeof upgradeContext>>;
        try {
            context = await upgradeContext(db, gymId, clientId);
        } catch (error: any) {
            // "Can't upgrade" is an answer here, not an error, so the profile can ask quietly and hide the action.
            if (error instanceof HttpError && error.status === 400) {
                return reply.send({ success: true, data: { current: null, credit: 0, options: [], reason: error.body?.message, canDiscount: false } });
            }
            throw error;
        }
        const { current, credit, options } = context;
        return reply.send({
            success: true,
            data: {
                current: { _id: current.id, planName: current.planName, startDate: current.startDate, endDate: current.endDate, totalAmount: current.totalAmount },
                credit,
                options,
                canDiscount: can(request, 'bill.discount'),
            },
        });
    } catch (error: any) {
        return sendError(request, reply, error);
    }
};

export const upgradeMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const body = (request.body ?? {}) as { clientId?: string; planId?: string; discount?: number; amountReceived?: number; method?: string; reason?: string };
        const discount = Math.max(0, Math.round(Number(body.discount) || 0));
        const received = Math.max(0, Math.round(Number(body.amountReceived) || 0));
        const reason = String(body.reason ?? '').trim();
        if (discount > 0 && !can(request, 'bill.discount')) {
            return reply.status(403).send({ success: false, message: "You can't give discounts. Ask the gym owner." });
        }
        if (!reason) return reply.status(400).send({ success: false, message: 'Add a reason for the upgrade' });

        const result = await db.transaction(async (tx) => {
            const { client, current, credit, options } = await upgradeContext(tx, gymId, body.clientId);
            const choice = options.find((o) => o._id === body.planId);
            if (!choice) throw new HttpError(400, { success: false, message: 'This plan is not available as an upgrade' });
            const newNet = choice.price - discount;
            if (newNet <= credit) throw new HttpError(400, { success: false, message: 'Discount is too large: the new plan must cost more than the current one' });
            const due = newNet - credit;
            if (received > due) throw new HttpError(400, { success: false, message: `Amount received cannot be more than ₹${due}` });

            const [upgraded] = await tx.insert(memberships).values({
                branchId: gymId,
                primaryMemberId: client.id,
                packageId: choice._id,
                planName: choice.planName,
                startDate: current.startDate,
                endDate: choice.endDate,
                totalAmount: newNet,
                totalPausedDays: current.totalPausedDays,
                status: 'active',
            }).returning();
            await tx.update(memberships).set({ status: 'upgraded', updatedAt: new Date() }).where(eq(memberships.id, current.id));

            const people = await memberIdsFor(tx, current.id);
            for (const memberId of people) {
                await addMembershipMember(tx, upgraded.id, memberId);
                await tx.update(members).set({ activeMembershipId: upgraded.id, membershipStatus: 'active', updatedAt: new Date() })
                    .where(eq(members.id, memberId));
            }

            const saved = await updateMember(tx, client.id, { balance: (client.balance || 0) + (due - received) });
            if (received > 0) {
                await tx.insert(payments).values({
                    branchId: gymId,
                    memberId: client.id,
                    membershipId: upgraded.id,
                    amount: received,
                    method: body.method || 'Cash',
                    paidAt: new Date(),
                    type: 'membership',
                    remarks: `Upgrade from ${current.planName} to ${choice.planName}`,
                    collectedByUserId: userId,
                });
            }
            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'UPGRADE',
                title: 'Membership upgraded',
                description: `${client.name} moved from ${current.planName} to ${choice.planName} (${reason})`,
                amount: received,
                memberId: client.id,
                date: new Date(),
            });
            return { saved, membershipId: upgraded.id };
        });

        await syncMembershipDoor(result.membershipId);
        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: await memberDoc(db, result.saved) });
    } catch (error: any) {
        return sendError(request, reply, error, 'Upgrade Error');
    }
};

export const amendMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { clientId, membershipId, planId, startDate, endDate, totalAmount, reason } = request.body as any;

        const result = await db.transaction(async (tx) => {
            if (!reason?.trim()) throw new HttpError(400, { success: false, error: 'Reason is required for membership update.' });

            const client = await findMember(tx, clientId, gymId);
            if (!client) throw new HttpError(404, { success: false, error: 'Client not found.' });

            const isActive = !!client.activeMembershipId && client.activeMembershipId === String(membershipId);
            const isUpcoming = !!client.upcomingMembershipId && client.upcomingMembershipId === String(membershipId);
            if (!isActive && !isUpcoming) {
                throw new HttpError(400, { success: false, error: 'Can only update active or upcoming membership.' });
            }

            const membership = await findMembership(tx, membershipId, gymId);
            if (!membership) throw new HttpError(404, { success: false, error: 'Membership not found.' });

            if (!['active', 'future', 'trial', 'paused'].includes(membership.status)) {
                throw new HttpError(400, { success: false, error: 'Cannot update expired or cancelled membership.' });
            }

            const plan = await findPackage(tx, planId || membership.packageId);
            if (!plan) throw new HttpError(404, { success: false, error: 'Plan not found.' });

            const oldAmount = membership.totalAmount;
            const next = { ...membership };

            if (planId) {
                next.packageId = plan.id;
                next.planName = plan.planName;
                if (!endDate && !startDate) {
                    next.endDate = calculateMembershipExpiry(next.startDate, plan.durationInMonths, plan.durationInDays);
                }
            }

            if (startDate) {
                const startValidation = validateMembershipStartDate(startDate);
                if (!startValidation.valid) throw new HttpError(400, { success: false, error: startValidation.error });
                next.startDate = startValidation.date!;
            }

            if (endDate) {
                const parsedEnd = new Date(parseToISTMidnight(endDate));
                parsedEnd.setHours(23, 59, 59, 999);
                next.endDate = parsedEnd;
            } else if (planId && startDate) {
                next.endDate = calculateMembershipExpiry(next.startDate, plan.durationInMonths, plan.durationInDays);
            }

            if (isActive && client.upcomingMembershipId) {
                const upcoming = await findMembership(tx, client.upcomingMembershipId);
                if (upcoming && next.endDate >= upcoming.startDate) {
                    throw new HttpError(400, { success: false, error: 'End date cannot overlap with upcoming membership.' });
                }
            }

            let balance = client.balance || 0;
            if (totalAmount !== undefined) {
                const delta = totalAmount - oldAmount;
                if (delta > 0) {
                    balance = balance + delta;
                } else if (delta < 0) {
                    balance = balance - Math.min(balance, Math.abs(delta));
                }
                next.totalAmount = totalAmount;
            }

            const newStatus = membership.status === 'paused'
                ? 'paused'
                : getMembershipStatusFromDates(next.startDate, next.endDate, plan.isTrial);

            const [savedMembership] = await tx.update(memberships).set({
                packageId: next.packageId,
                planName: next.planName,
                startDate: next.startDate,
                endDate: next.endDate,
                totalAmount: next.totalAmount,
                status: newStatus,
                updatedAt: new Date(),
            }).where(eq(memberships.id, membership.id)).returning();

            let activeMembershipId = client.activeMembershipId;
            let upcomingMembershipId = client.upcomingMembershipId;
            if (newStatus === 'future') {
                upcomingMembershipId = membership.id;
                activeMembershipId = isActive ? null : activeMembershipId;
            } else if (['active', 'trial', 'paused'].includes(newStatus)) {
                activeMembershipId = membership.id;
                if (isUpcoming) upcomingMembershipId = null;
            } else {
                if (activeMembershipId === membership.id) activeMembershipId = null;
                if (upcomingMembershipId === membership.id) upcomingMembershipId = null;
            }
            await updateMember(tx, client.id, { balance, activeMembershipId, upcomingMembershipId, membershipStatus: newStatus });

            await syncMembersForMembership(tx, membership.id, newStatus);

            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'MEMBERSHIP_AMENDED',
                title: 'Membership updated',
                description: `${client.name}'s ${savedMembership.planName} updated: ${reason}`,
                memberId: client.id,
                date: new Date(),
            });

            return { clientId: client.id, membership: savedMembership };
        });

        invalidateClientCaches(gymId);
        await syncMembershipDoor(result.membership.id);
        const client = await findMember(db, result.clientId);
        return reply.send({
            success: true,
            data: {
                client: client ? await memberDoc(db, client) : null,
                membership: await membershipDoc(db, result.membership),
            },
        });
    } catch (error: any) {
        return sendError(request, reply, error);
    }
};

export const pauseMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { membershipId, reason } = request.body as any;

        const membership = await db.transaction(async (tx) => {
            const found = await findMembership(tx, membershipId, gymId);
            if (!found) throw new HttpError(404, { success: false, error: 'Membership not found.' });

            if (!['active', 'trial'].includes(found.status)) {
                throw new HttpError(400, { success: false, error: 'Only active or trial memberships can be paused.' });
            }

            const [saved] = await tx.update(memberships)
                .set({ status: 'paused', updatedAt: new Date() })
                .where(eq(memberships.id, found.id))
                .returning();
            await tx.insert(membershipPauses).values({ membershipId: found.id, startedAt: new Date(), reason: reason || undefined });

            await syncMembersForMembership(tx, found.id, 'paused');

            const primaryClient = await findMember(tx, found.primaryMemberId);
            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'PAUSE',
                title: 'Membership paused',
                description: `${primaryClient?.name}'s ${found.planName} membership paused${reason ? `: ${reason}` : ''}`,
                memberId: found.primaryMemberId,
                date: new Date(),
            });
            return saved;
        });

        invalidateClientCaches(gymId);
        await syncMembershipDoor(membership.id);
        return reply.send({ success: true, data: await membershipDoc(db, membership) });
    } catch (error: any) {
        return sendError(request, reply, error);
    }
};

export const resumeMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { membershipId } = request.body as any;

        const membership = await db.transaction(async (tx) => {
            const found = await findMembership(tx, membershipId, gymId);
            if (!found) throw new HttpError(404, { success: false, error: 'Membership not found.' });

            if (found.status !== 'paused') throw new HttpError(400, { success: false, error: 'Membership is not paused.' });

            const pauseHistory = (await pausesFor(tx, [found.id])).get(found.id) ?? [];
            const currentPause = pauseHistory[pauseHistory.length - 1];
            if (!currentPause || currentPause.endedAt) {
                throw new HttpError(400, { success: false, error: 'No active pause record found.' });
            }

            const now = new Date();
            const pauseStart = getNowIST(currentPause.startedAt).startOf('day');
            const resumeDay = getNowIST().startOf('day');
            const pauseDays = resumeDay.diff(pauseStart, 'day');
            await tx.update(membershipPauses).set({ endedAt: now, days: pauseDays }).where(eq(membershipPauses.id, currentPause.id));

            const newEndDate = addUtcDays(found.endDate, pauseDays);
            const plan = await findPackage(tx, found.packageId);
            const newStatus = getMembershipStatusFromDates(found.startDate, newEndDate, plan?.isTrial || false);
            const [saved] = await tx.update(memberships).set({
                totalPausedDays: (found.totalPausedDays || 0) + pauseDays,
                endDate: newEndDate,
                status: newStatus,
                updatedAt: new Date(),
            }).where(eq(memberships.id, found.id)).returning();

            await syncMembersForMembership(tx, found.id, newStatus);

            const primaryClient = await findMember(tx, found.primaryMemberId);
            await addActivity(tx, {
                gymId,
                actorUserId: userId,
                type: 'RESUME',
                title: 'Membership resumed',
                description: `${primaryClient?.name}'s ${found.planName} resumed after ${pauseDays} day(s). New expiry: ${formatDisplayDate(newEndDate)}`,
                memberId: found.primaryMemberId,
                date: new Date(),
            });
            return saved;
        });

        invalidateClientCaches(gymId);
        await syncMembershipDoor(membership.id);
        return reply.send({ success: true, data: await membershipDoc(db, membership) });
    } catch (error: any) {
        return sendError(request, reply, error);
    }
};

export const getClientActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const userId = (request.user as any).userId as string;
        const { id } = request.query as any;
        const member = await findMember(db, id, gymId);
        if (!member) return reply.send({ success: true, data: [] });

        const [activityRows, messages] = await Promise.all([
            db.select().from(activities)
                .where(and(eq(activities.branchId, gymId), eq(activities.memberId, member.id)))
                .orderBy(desc(activities.date)).limit(50),
            db.select().from(messageLogs)
                .where(and(eq(messageLogs.branchId, gymId), eq(messageLogs.memberId, member.id)))
                .orderBy(desc(messageLogs.sentAt)).limit(50),
        ]);

        const timeline = [
            ...activityRows.map((a) => compact({
                type: 'activity',
                activityType: a.type,
                title: a.title,
                description: a.description,
                amount: a.amount,
                date: a.createdAt || a.date,
            })),
            ...messages.map((m) => compact({
                type: 'message',
                activityType: 'WHATSAPP',
                title: m.template ? `WhatsApp: ${m.template}` : 'WhatsApp message',
                // The app turns these into readable titles (template names are internal).
                template: m.template,
                direction: m.direction,
                description: m.summary,
                date: m.sentAt,
                status: m.status,
                errorMessage: m.errorMessage,
            })),
        ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return reply.send({ success: true, data: timeline });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateClient = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { id, name, phoneNumber, age, birthday, gender } = request.body;
        const existing = await findMember(db, id, gymId);
        if (!existing) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }
        const client = await updateMember(db, existing.id, memberFields({ name, phoneNumber, age, birthday, gender }));

        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: await memberDoc(db, client) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

const populatedMembership = async (membershipId: string | null, withPauses: boolean) => {
    if (!membershipId) return undefined;
    const membership = await findMembership(db, membershipId);
    if (!membership) return null;
    const payer = await findMember(db, membership.primaryMemberId);
    const pauses = withPauses ? (await pausesFor(db, [membership.id])).get(membership.id) ?? [] : undefined;
    const doc = serializeMembership(membership, { pauses });
    return compact({
        _id: doc._id,
        startDate: doc.startDate,
        endDate: doc.endDate,
        status: doc.status,
        planName: doc.planName,
        primaryMemberId: payer ? { _id: payer.id, name: payer.name, balance: payer.balance } : null,
        totalAmount: doc.totalAmount,
        pauseHistory: withPauses ? doc.pauseHistory ?? [] : undefined,
        totalPausedDays: withPauses ? doc.totalPausedDays : undefined,
        planId: doc.planId,
    });
};

export const getClientById = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;
        const client = await findMember(db, id, gymId);

        if (!client) {
            return reply.status(404).send({ success: false, error: "Client not found" });
        }

        const [activeMembership, upcomingMembership, history, paymentHistory] = await Promise.all([
            populatedMembership(client.activeMembershipId, true),
            populatedMembership(client.upcomingMembershipId, false),
            db.select({ membership: memberships })
                .from(membershipMembers)
                .innerJoin(memberships, eq(memberships.id, membershipMembers.membershipId))
                .where(eq(membershipMembers.memberId, client.id))
                .orderBy(desc(memberships.startDate)),
            paymentHistoryFor(db, client.id),
        ]);

        const membershipHistory = history.map(({ membership: m }) => compact({
            _id: m.id,
            startDate: m.startDate,
            endDate: m.endDate,
            status: m.status,
            planName: m.planName,
            totalAmount: m.totalAmount,
        }));

        return reply.send({
            success: true,
            data: serializeMember(client, { activeMembership, upcomingMembership, membershipHistory, paymentHistory }),
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const deleteClient = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;

        const client = await findMember(db, id, gymId);

        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }

        await deleteMemberFromDevice(client.id);
        // Delete associated assigned memberships, activities and message logs
        await db.transaction(async (tx) => {
            await tx.delete(memberships).where(eq(memberships.primaryMemberId, client.id));
            await tx.delete(activities).where(eq(activities.memberId, client.id));
            await tx.delete(messageLogs).where(eq(messageLogs.memberId, client.id));
            await tx.delete(members).where(eq(members.id, client.id));
        });

        invalidateClientCaches(gymId);
        return reply.send({ success: true, message: 'Client deleted successfully' });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
