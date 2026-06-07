import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import Activity from "../models/Activity.js";
import AssignedMembership from "../models/AssignedMembership.js";
import Client from "../models/Client.js";
import Membership from "../models/Memberships.js";
import Gym from "../models/Gym.js";
import Settings from "../models/Settings.js";
import MessageLog from "../models/MessageLog.js";
import { sendWhatsAppTemplate, logSkippedWhatsApp } from "../services/Whatsapp.js";
import {
    getISTMidnightToday,
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
import { STALE_WHATSAPP_SKIP_DAYS } from "../utils/Constants.js";
import { cache, getCacheKey } from "../utils/cache.js";

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

const invalidateClientCaches = (gymId: string) => {
    cache.del([getCacheKey('client_list', gymId), getCacheKey('dashboard_summary', gymId)]);
};

const applyPayment = (
    client: any,
    totalAmount: number,
    amountReceived: number,
    method: string,
    membershipId: mongoose.Types.ObjectId
) => {
    const balanceDue = totalAmount - amountReceived;
    client.balance = (client.balance || 0) + balanceDue;

    if (amountReceived > 0) {
        const remarks = balanceDue > 0
            ? `Partial payment (₹${amountReceived} of ₹${totalAmount})`
            : 'Membership';
        client.paymentHistory.push({
            amount: amountReceived,
            method: method as any,
            date: new Date(),
            membershipId,
            type: 'membership',
            remarks,
        });
    }
};

export const getAllClients = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const cacheKey = getCacheKey('client_list', gymId);

        const cachedClients = cache.get(cacheKey);
        if (cachedClients) {
            return reply.status(200).send({ success: true, data: cachedClients });
        }

        const clients = await Client.find({ gymId })
            .select('name phoneNumber gender membershipStatus activeMembership balance role')
            .populate({ path: 'activeMembership', select: 'endDate planName status pauseHistory totalPausedDays' })
            .sort({ name: 1 })
            .lean();

        cache.set(cacheKey, clients);

        return reply.status(200).send({ success: true, data: clients });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const onBoarding = async (request: FastifyRequest<{ Body: OnboardingBody }>, reply: FastifyReply) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { primaryDetails, dependents = [], planId, method, paymentReceived, amountReceived, startDate, amount } = request.body;

        const plan = await Membership.findById(planId).session(session);
        if (!plan) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: "Membership not found" });
        }

        const paymentResult = resolveAmountReceived(amount, amountReceived, paymentReceived);
        if (paymentResult.error) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: paymentResult.error });
        }

        const today = getISTMidnightToday();
        const startDateStr = startDate || today.toISOString().split('T')[0];
        const startValidation = validateMembershipStartDate(startDateStr);
        if (!startValidation.valid) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: startValidation.error });
        }

        const customStartDate = startValidation.date!;
        const expiryValidation = validateMembershipNotExpiredOnCreate(
            customStartDate,
            plan.durationInMonths,
            plan.durationInDays
        );
        if (!expiryValidation.valid) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: expiryValidation.error });
        }

        const endDate = expiryValidation.endDate!;

        let membershipStatus: string = 'active';
        if (endDate < today) {
            membershipStatus = plan.isTrial ? 'trial_expired' : 'expired';
        } else if (customStartDate > today) {
            membershipStatus = 'future';
        } else if (plan.isTrial) {
            membershipStatus = 'trial';
        }

        const [primaryClient] = await Client.create([{
            ...primaryDetails,
            gymId,
            role: 'primary',
            membershipStatus
        }], { session });

        const [newAssignedMembership] = await AssignedMembership.create([{
            gymId,
            primaryMemberId: primaryClient._id,
            memberIds: [primaryClient._id],
            planId: plan._id,
            planName: plan.planName,
            startDate: customStartDate,
            endDate: endDate,
            totalAmount: amount,
            status: membershipStatus
        }], { session });

        if (dependents.length > 0) {
            for (let dep of dependents) {
                let depClient;
                if (dep.clientId) {
                    depClient = await Client.findByIdAndUpdate(dep.clientId, {
                        role: 'dependent',
                        membershipStatus,
                        activeMembership: ['active', 'trial', 'expired', 'trial_expired'].includes(membershipStatus) ? newAssignedMembership._id : undefined,
                        upcomingMembership: membershipStatus === 'future' ? newAssignedMembership._id : undefined,
                    }, { new: true, session });
                } else {
                    [depClient] = await Client.create([{
                        ...dep,
                        gymId,
                        role: 'dependent',
                        membershipStatus,
                        activeMembership: ['active', 'trial', 'expired', 'trial_expired'].includes(membershipStatus) ? newAssignedMembership._id : undefined,
                        upcomingMembership: membershipStatus === 'future' ? newAssignedMembership._id : undefined,
                    }], { session });
                }

                if (depClient) {
                    depClient.membershipHistory.push(newAssignedMembership._id);
                    await depClient.save({ session });
                    newAssignedMembership.memberIds.push(depClient._id);
                }
            }
            await newAssignedMembership.save({ session });
        }

        primaryClient.activeMembership = ['active', 'trial', 'expired', 'trial_expired'].includes(membershipStatus) ? newAssignedMembership._id : undefined;
        primaryClient.upcomingMembership = membershipStatus === 'future' ? newAssignedMembership._id : undefined;
        applyPayment(primaryClient, amount, paymentResult.received, method, newAssignedMembership._id);
        primaryClient.membershipHistory.push(newAssignedMembership._id);
        await primaryClient.save({ session });

        await Activity.create([{
            gymId,
            type: 'ONBOARDING',
            title: `New member${dependents.length > 0 ? 's' : ''} joined`,
            description: `${primaryClient.name} joined with a ${plan.planName} plan starting ${formatDisplayDate(customStartDate)}${dependents.length > 0 ? ` along with ${dependents.length} members` : ''}`,
            amount: paymentResult.received,
            memberId: primaryClient._id,
            date: today
        }], { session });

        await session.commitTransaction();

        const settings = await Settings.findOne({ gymId });
        const staleCutoff = addUtcDays(today, -STALE_WHATSAPP_SKIP_DAYS);
        if (settings?.whatsapp?.active && settings?.whatsapp?.sendOnOnboarding !== false) {
            if (customStartDate < staleCutoff) {
                await logSkippedWhatsApp(gymId, String(primaryClient._id), 'onboarding', 'Skipped: membership start date is older than 7 days');
            } else {
                const gymInfo = await Gym.findById(gymId);
                const params = [primaryClient.name, gymInfo?.name || 'Gym', plan.planName, formatShortDate(customStartDate), formatShortDate(endDate)];
                sendWhatsAppTemplate(`91${primaryClient.phoneNumber}`, "onboarding", params, settings?.whatsapp, gymInfo?.name, { gymId, clientId: String(primaryClient._id) });
            }
        }

        invalidateClientCaches(gymId);
        return reply.status(201).send({ success: true, data: primaryClient });
    } catch (error: any) {
        await session.abortTransaction();
        request.log.error({ err: error }, 'Onboarding Error');
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

export const getClientStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;

        const totalClients = await Client.countDocuments({ gymId });
        const activeMembers = await Client.countDocuments({ gymId, membershipStatus: 'active' });
        const expiredMembers = await Client.countDocuments({ gymId, membershipStatus: { $in: ['expired', 'trial_expired'] } });
        const upcomingMembers = await Client.countDocuments({ gymId, membershipStatus: 'future' });
        const pausedMembers = await Client.countDocuments({ gymId, membershipStatus: 'paused' });
        const clientsWithBalance = await Client.countDocuments({ gymId, balance: { $gt: 0 } });

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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { id, planId, startDate, amount, method, paymentReceived, amountReceived, dependents } = request.body;

        const paymentResult = resolveAmountReceived(amount, amountReceived, paymentReceived);
        if (paymentResult.error) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: paymentResult.error });
        }

        const primaryClient = await Client.findById(id).session(session);
        const plan = await Membership.findById(planId).session(session);

        if (!primaryClient || !plan) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, message: `${!primaryClient ? 'Client' : 'Plan'} not found` });
        }

        const startValidation = validateMembershipStartDate(startDate);
        if (!startValidation.valid) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: startValidation.error });
        }

        const today = getISTMidnightToday();
        const newStartDate = startValidation.date!;
        const expiryValidation = validateMembershipNotExpiredOnCreate(
            newStartDate,
            plan.durationInMonths,
            plan.durationInDays
        );
        if (!expiryValidation.valid) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: expiryValidation.error });
        }

        const newEndDate = expiryValidation.endDate!;
        const status = newEndDate < today
            ? (plan.isTrial ? 'trial_expired' : 'expired')
            : (newStartDate > today ? 'future' : (plan.isTrial ? 'trial' : 'active'));

        const [renewedMembership] = await AssignedMembership.create([{
            gymId,
            primaryMemberId: primaryClient._id,
            memberIds: [primaryClient._id],
            planId: plan._id,
            planName: plan.planName,
            startDate: newStartDate,
            endDate: newEndDate,
            totalAmount: amount,
            status: status
        }], { session });

        for (let dep of dependents) {
            let depClient;
            if (dep.clientId) {
                depClient = await Client.findById(dep.clientId).session(session);
            } else {
                [depClient] = await Client.create([{ ...dep, gymId }], { session });
            }

            if (depClient) {
                depClient.role = 'dependent';
                depClient.membershipStatus = status as any;
                if (['active', 'trial', 'expired', 'trial_expired'].includes(status)) {
                    depClient.activeMembership = renewedMembership._id;
                } else {
                    depClient.upcomingMembership = renewedMembership._id;
                }
                depClient.membershipHistory.push(renewedMembership._id);
                await depClient.save({ session });
                renewedMembership.memberIds.push(depClient._id);
            }
        }
        await renewedMembership.save({ session });

        let activityType: 'RENEWAL' | 'ADVANCE_RENEWAL' = 'RENEWAL';
        if (['active', 'trial', 'expired', 'trial_expired'].includes(status)) {
            primaryClient.membershipStatus = status as any;
            primaryClient.activeMembership = renewedMembership._id;
        } else {
            activityType = 'ADVANCE_RENEWAL';
            primaryClient.upcomingMembership = renewedMembership._id;
        }

        applyPayment(primaryClient, amount, paymentResult.received, method, renewedMembership._id);
        primaryClient.membershipHistory.push(renewedMembership._id);
        await primaryClient.save({ session });

        await Activity.create([{
            gymId: gymId,
            type: activityType,
            title: activityType === 'RENEWAL' ? 'Membership Renewed' : 'Advance Renewal',
            description: activityType === 'RENEWAL' ?
                `${primaryClient.name} renewed the ${plan.planName} plan` :
                `${primaryClient.name} pre-paid for ${plan.planName} starting on ${formatDisplayDate(newStartDate)}`,
            amount: paymentResult.received,
            memberId: primaryClient._id,
            date: today
        }], { session });

        await session.commitTransaction();

        const settings = await Settings.findOne({ gymId });
        if (settings?.whatsapp?.active && settings?.whatsapp?.sendOnRenewal !== false) {
            const gymInfo = await Gym.findById(gymId);
            const params = [primaryClient.name, plan?.planName, formatShortDate(newStartDate), formatShortDate(newEndDate)];
            sendWhatsAppTemplate(`91${primaryClient.phoneNumber}`, "renewal_complete", params, settings?.whatsapp, gymInfo?.name, { gymId, clientId: String(primaryClient._id) });
        }

        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: primaryClient });
    } catch (error: any) {
        await session.abortTransaction();
        request.log.error({ err: error }, 'Renewal Error');
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

export const collectPayment = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { clientId, amount, method, date, remarks } = request.body as any;

        if (!amount || amount <= 0) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: 'Amount must be greater than 0.' });
        }

        const client = await Client.findOne({ _id: clientId, gymId }).session(session);
        if (!client) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: 'Client not found.' });
        }

        if (amount > client.balance) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: `Amount cannot exceed outstanding balance of ₹${client.balance}.` });
        }

        client.paymentHistory.push({
            amount,
            method: method as any,
            date: date ? new Date(date) : new Date(),
            remarks: remarks || 'Balance collection',
            type: 'balance_collection',
        });
        client.balance -= amount;
        await client.save({ session });

        await Activity.create([{
            gymId,
            type: 'PAYMENT',
            title: 'Balance collected',
            description: `₹${amount} collected from ${client.name}${remarks ? ` — ${remarks}` : ''}`,
            amount,
            memberId: client._id,
            date: getISTMidnightToday(),
        }], { session });

        await session.commitTransaction();
        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: client });
    } catch (error: any) {
        await session.abortTransaction();
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

export const amendMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { clientId, membershipId, planId, startDate, endDate, totalAmount, reason } = request.body as any;

        if (!reason?.trim()) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: 'Reason is required for membership update.' });
        }

        const client = await Client.findOne({ _id: clientId, gymId }).session(session);
        if (!client) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: 'Client not found.' });
        }

        const isActive = String(client.activeMembership) === String(membershipId);
        const isUpcoming = String(client.upcomingMembership) === String(membershipId);
        if (!isActive && !isUpcoming) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: 'Can only update active or upcoming membership.' });
        }

        const membership = await AssignedMembership.findOne({ _id: membershipId, gymId }).session(session);
        if (!membership) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: 'Membership not found.' });
        }

        if (!['active', 'future', 'trial', 'paused'].includes(membership.status)) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: 'Cannot update expired or cancelled membership.' });
        }

        const plan = planId
            ? await Membership.findById(planId).session(session)
            : await Membership.findById(membership.planId).session(session);

        if (!plan) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: 'Plan not found.' });
        }

        const today = getISTMidnightToday();
        const oldAmount = membership.totalAmount;

        if (planId) {
            membership.planId = plan._id;
            membership.planName = plan.planName;
            if (!endDate && !startDate) {
                const start = membership.startDate;
                membership.endDate = calculateMembershipExpiry(start, plan.durationInMonths, plan.durationInDays);
            }
        }

        if (startDate) {
            const startValidation = validateMembershipStartDate(startDate);
            if (!startValidation.valid) {
                await session.abortTransaction();
                return reply.status(400).send({ success: false, error: startValidation.error });
            }
            membership.startDate = startValidation.date!;
        }

        if (endDate) {
            const parsedEnd = parseToISTMidnight(endDate);
            membership.endDate = new Date(parsedEnd);
            membership.endDate.setHours(23, 59, 59, 999);
        } else if (planId && startDate) {
            membership.endDate = calculateMembershipExpiry(membership.startDate, plan.durationInMonths, plan.durationInDays);
        }

        if (isActive && client.upcomingMembership) {
            const upcoming = await AssignedMembership.findById(client.upcomingMembership).session(session);
            if (upcoming && membership.endDate >= upcoming.startDate) {
                await session.abortTransaction();
                return reply.status(400).send({ success: false, error: 'End date cannot overlap with upcoming membership.' });
            }
        }

        if (totalAmount !== undefined) {
            const delta = totalAmount - oldAmount;
            if (delta > 0) {
                client.balance = (client.balance || 0) + delta;
            } else if (delta < 0) {
                const reduction = Math.min(client.balance || 0, Math.abs(delta));
                client.balance = (client.balance || 0) - reduction;
            }
            membership.totalAmount = totalAmount;
        }

        const newStatus = membership.status === 'paused'
            ? 'paused'
            : getMembershipStatusFromDates(membership.startDate, membership.endDate, plan.isTrial);

        membership.status = newStatus as any;
        await membership.save({ session });

        if (newStatus === 'future') {
            client.upcomingMembership = membership._id;
            client.activeMembership = isActive ? undefined : client.activeMembership;
        } else if (['active', 'trial', 'paused'].includes(newStatus)) {
            client.activeMembership = membership._id;
            if (isUpcoming) client.upcomingMembership = undefined;
        } else {
            if (String(client.activeMembership) === String(membership._id)) {
                client.activeMembership = undefined;
            }
            if (String(client.upcomingMembership) === String(membership._id)) {
                client.upcomingMembership = undefined;
            }
        }
        client.membershipStatus = newStatus as any;
        await client.save({ session });

        await syncMembersForMembership(membership, newStatus, session);

        await Activity.create([{
            gymId,
            type: 'MEMBERSHIP_AMENDED',
            title: 'Membership updated',
            description: `${client.name}'s ${membership.planName} updated: ${reason}`,
            memberId: client._id,
            date: today,
        }], { session });

        await session.commitTransaction();
        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: { client, membership } });
    } catch (error: any) {
        await session.abortTransaction();
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

export const pauseMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { membershipId, reason } = request.body as any;

        const membership = await AssignedMembership.findOne({ _id: membershipId, gymId }).session(session);
        if (!membership) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: 'Membership not found.' });
        }

        if (!['active', 'trial'].includes(membership.status)) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: 'Only active or trial memberships can be paused.' });
        }

        membership.status = 'paused';
        membership.pauseHistory = membership.pauseHistory || [];
        membership.pauseHistory.push({
            startedAt: new Date(),
            reason: reason || undefined,
        });
        await membership.save({ session });

        await syncMembersForMembership(membership, 'paused', session);

        const primaryClient = await Client.findById(membership.primaryMemberId).session(session);
        await Activity.create([{
            gymId,
            type: 'PAUSE',
            title: 'Membership paused',
            description: `${primaryClient?.name}'s ${membership.planName} membership paused${reason ? `: ${reason}` : ''}`,
            memberId: membership.primaryMemberId,
            date: getISTMidnightToday(),
        }], { session });

        await session.commitTransaction();
        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: membership });
    } catch (error: any) {
        await session.abortTransaction();
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

export const resumeMembership = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { membershipId } = request.body as any;

        const membership = await AssignedMembership.findOne({ _id: membershipId, gymId }).session(session);
        if (!membership) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: 'Membership not found.' });
        }

        if (membership.status !== 'paused') {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: 'Membership is not paused.' });
        }

        const pauseHistory = membership.pauseHistory || [];
        const currentPause = pauseHistory[pauseHistory.length - 1];
        if (!currentPause || currentPause.endedAt) {
            await session.abortTransaction();
            return reply.status(400).send({ success: false, error: 'No active pause record found.' });
        }

        const now = new Date();
        const pauseDays = Math.ceil((now.getTime() - new Date(currentPause.startedAt).getTime()) / (1000 * 60 * 60 * 24));
        currentPause.endedAt = now;
        currentPause.days = pauseDays;
        membership.totalPausedDays = (membership.totalPausedDays || 0) + pauseDays;
        membership.endDate = addUtcDays(membership.endDate, pauseDays);

        const plan = await Membership.findById(membership.planId).session(session);
        const newStatus = getMembershipStatusFromDates(
            membership.startDate,
            membership.endDate,
            plan?.isTrial || false
        );
        membership.status = newStatus as any;
        await membership.save({ session });

        await syncMembersForMembership(membership, newStatus, session);

        const primaryClient = await Client.findById(membership.primaryMemberId).session(session);
        await Activity.create([{
            gymId,
            type: 'RESUME',
            title: 'Membership resumed',
            description: `${primaryClient?.name}'s ${membership.planName} resumed after ${pauseDays} day(s). New expiry: ${formatDisplayDate(membership.endDate)}`,
            memberId: membership.primaryMemberId,
            date: getISTMidnightToday(),
        }], { session });

        await session.commitTransaction();
        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: membership });
    } catch (error: any) {
        await session.abortTransaction();
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

export const getClientActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { id } = request.query as any;

        const [activities, messages] = await Promise.all([
            Activity.find({ gymId, memberId: id }).sort({ date: -1 }).limit(50).lean(),
            MessageLog.find({ gymId, clientId: id }).sort({ sentAt: -1 }).limit(50).lean(),
        ]);

        const timeline = [
            ...activities.map((a: any) => ({
                type: 'activity',
                activityType: a.type,
                title: a.title,
                description: a.description,
                amount: a.amount,
                date: a.date,
            })),
            ...messages.map((m: any) => ({
                type: 'message',
                activityType: 'WHATSAPP',
                title: `WhatsApp: ${m.template}`,
                description: m.summary,
                date: m.sentAt,
                status: m.status,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
        const client = await Client.findOneAndUpdate(
            { _id: id, gymId },
            { name, phoneNumber, age, gender, birthday },
            { new: true, runValidators: true }
        );
        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }

        invalidateClientCaches(gymId);
        return reply.send({ success: true, data: client });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getClientById = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;
        const client = await Client.findOne({ _id: id, gymId }).populate({
            path: 'activeMembership',
            select: 'startDate endDate status planName primaryMemberId totalAmount pauseHistory totalPausedDays planId',
            populate: { path: 'primaryMemberId', select: 'name balance' }
        }).populate({
            path: 'upcomingMembership',
            select: 'startDate endDate status planName primaryMemberId totalAmount planId',
            populate: { path: 'primaryMemberId', select: 'name balance' }
        }).populate({
            path: 'membershipHistory',
            select: 'startDate endDate status planName totalAmount',
            options: { sort: { startDate: -1 } }
        }).lean();

        if (!client) {
            return reply.status(404).send({ success: false, error: "Client not found" });
        }
        return reply.send({ success: true, data: client });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const deleteClient = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;

        const client = await Client.findOne({ _id: id, gymId });

        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }

        // Delete associated assigned memberships, activities and message logs
        await Promise.all([
            AssignedMembership.deleteMany({ primaryMemberId: id }),
            Activity.deleteMany({ memberId: id }),
            MessageLog.deleteMany({ clientId: id }),
            Client.findByIdAndDelete(id)
        ]);

        invalidateClientCaches(gymId);
        return reply.send({ success: true, message: 'Client deleted successfully' });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
