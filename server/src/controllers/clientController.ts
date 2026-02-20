import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import Activity from "../models/Activity.js";
import AssignedMembership from "../models/AssignedMembership.js";
import Client from "../models/Client.js";
import Membership from "../models/Memberships.js";
import Gym from "../models/Gym.js";
import Settings from "../models/Settings.js";
import { sendWhatsAppTemplate } from "../services/Whatsapp.js";
import {
    getNowIST,
    getISTMidnightToday,
    parseToISTMidnight,
    calculateMembershipExpiry,
    formatShortDate,
    formatDisplayDate
} from "../utils/timeUtils.js";

// Types for requests
interface OnboardingBody {
    primaryDetails: any;
    dependents?: any[];
    planId: string;
    method: string;
    paymentReceived: boolean;
    startDate?: string;
    amount: number;
}

interface RenewalBody {
    id: string;
    planId: string;
    startDate: string;
    amount: number;
    method: string;
    paymentReceived: boolean;
    dependents: any[];
}

export const getAllClients = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const clients = await Client.find({ gymId })
            .select('name phoneNumber gender membershipStatus activeMembership')
            .populate({ path: 'activeMembership', select: 'endDate planName' })
            .sort({ name: 1 });
        return reply.status(200).send({ success: true, data: clients });
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const onBoarding = async (request: FastifyRequest<{ Body: OnboardingBody }>, reply: FastifyReply) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { primaryDetails, dependents = [], planId, method, paymentReceived, startDate, amount } = request.body;

        const plan = await Membership.findById(planId).session(session);
        if (!plan) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, error: "Membership not found" });
        }

        const today = getISTMidnightToday();
        const customStartDate = startDate ? parseToISTMidnight(startDate) : today;
        const endDate = calculateMembershipExpiry(customStartDate, plan.durationInMonths, plan.durationInDays);

        // Define status
        let membershipStatus: string = 'active';
        if (customStartDate > today) {
            membershipStatus = 'future';
        } else if (plan.isTrial) {
            membershipStatus = 'trial';
        }

        // 1. Create Primary Client
        const [primaryClient] = await Client.create([{
            ...primaryDetails,
            gymId,
            role: 'primary',
            membershipStatus
        }], { session });

        // 2. Create Assigned Membership 
        const [newAssignedMembership] = await AssignedMembership.create([{
            gymId,
            primaryMemberId: primaryClient._id,
            memberIds: [primaryClient._id],
            planId: plan._id,
            planName: plan.planName,
            startDate: customStartDate,
            endDate: endDate,
            totalAmount: amount, // Fixed property name
            status: membershipStatus
        }], { session });

        // 3. Handle Dependents
        if (dependents.length > 0) {
            for (let dep of dependents) {
                let depClient;
                if (dep.clientId) {
                    depClient = await Client.findByIdAndUpdate(dep.clientId, {
                        role: 'dependent',
                        membershipStatus,
                        activeMembership: membershipStatus === 'active' ? newAssignedMembership._id : undefined,
                        upcomingMembership: membershipStatus === 'future' ? newAssignedMembership._id : undefined,
                    }, { new: true, session });
                } else {
                    [depClient] = await Client.create([{
                        ...dep,
                        gymId,
                        role: 'dependent',
                        membershipStatus,
                        activeMembership: membershipStatus === 'active' ? newAssignedMembership._id : undefined,
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

        // 4. Update Primary Client with membership link and balances
        let balance = paymentReceived ? 0 : amount;
        primaryClient.activeMembership = ['active', 'trial'].includes(membershipStatus) ? newAssignedMembership._id : undefined;
        primaryClient.upcomingMembership = membershipStatus === 'future' ? newAssignedMembership._id : undefined;
        primaryClient.balance = balance;

        if (paymentReceived) {
            primaryClient.paymentHistory.push({
                amount,
                method: method as any,
                date: new Date(),
                membershipId: newAssignedMembership._id
            });
        }

        primaryClient.membershipHistory.push(newAssignedMembership._id);
        await primaryClient.save({ session });

        // 5. Activity log
        await Activity.create([{
            gymId,
            type: 'ONBOARDING',
            title: `New member${dependents.length > 0 ? 's' : ''} joined`,
            description: `${primaryClient.name} joined with a ${plan.planName} plan ${dependents.length > 0 ? `along with ${dependents.length} members` : ''}`,
            amount: paymentReceived ? amount : 0,
            memberId: primaryClient._id,
            date: today
        }], { session });

        await session.commitTransaction();

        // 6. Messaging (Post-transaction)
        const settings = await Settings.findOne({ gymId });
        if (settings?.whatsapp?.active && settings?.whatsapp?.sendOnOnboarding !== false) {
            const gymInfo = await Gym.findById(gymId);
            const params = [primaryClient.name, gymInfo?.name || 'Gym', plan.planName, formatShortDate(customStartDate), formatShortDate(endDate)];
            sendWhatsAppTemplate(`91${primaryClient.phoneNumber}`, "onboarding", params, settings?.whatsapp);
        }

        return reply.status(201).send({ success: true, data: primaryClient });
    } catch (error: any) {
        await session.abortTransaction();
        console.error('Onboarding Error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

export const getClientStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;

        // Correct way to get stats is by checking the Client's membershipStatus field
        // which is managed by our daily cron job.
        const totalClients = await Client.countDocuments({ gymId });
        const activeMembers = await Client.countDocuments({ gymId, membershipStatus: 'active' });
        const expiredMembers = await Client.countDocuments({ gymId, membershipStatus: { $in: ['expired', 'trial_expired'] } });
        const upcomingMembers = await Client.countDocuments({ gymId, membershipStatus: 'future' });

        return reply.send({
            success: true,
            data: {
                totalClients,
                activeMembers,
                expiredMembers,
                upcomingMembers
            }
        });
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const renewMembership = async (request: FastifyRequest<{ Body: RenewalBody }>, reply: FastifyReply) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const gymId = (request.user as any).gymId;
        const { id, planId, startDate, amount, method, paymentReceived, dependents } = request.body;

        const primaryClient = await Client.findById(id).session(session);
        const plan = await Membership.findById(planId).session(session);

        if (!primaryClient || !plan) {
            await session.abortTransaction();
            return reply.status(404).send({ success: false, message: `${!primaryClient ? 'Client' : 'Plan'} not found` });
        }

        const today = getISTMidnightToday();
        const newStartDate = parseToISTMidnight(startDate);
        const newEndDate = calculateMembershipExpiry(newStartDate, plan.durationInMonths, plan.durationInDays);
        const status = newStartDate > today ? 'future' : 'active';

        // 1. Create Renewed Membership
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

        // 2. Process Dependents
        for (let dep of dependents) {
            let depClient;
            if (dep.clientId) {
                depClient = await Client.findById(dep.clientId).session(session);
            } else {
                [depClient] = await Client.create([{ ...dep, gymId }], { session });
            }

            if (depClient) {
                depClient.role = 'dependent';
                depClient.membershipStatus = status;
                if (status === 'active') {
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

        // 3. Update Primary Client
        let activityType: 'RENEWAL' | 'ADVANCE_RENEWAL' = 'RENEWAL';
        if (status === 'active') {
            primaryClient.membershipStatus = 'active';
            primaryClient.activeMembership = renewedMembership._id;
        } else {
            activityType = 'ADVANCE_RENEWAL';
            primaryClient.upcomingMembership = renewedMembership._id;
        }

        // 4. Payments
        if (paymentReceived) {
            primaryClient.paymentHistory.push({
                amount,
                method: method as any,
                date: new Date(),
                membershipId: renewedMembership._id
            });
        } else {
            primaryClient.balance += amount;
        }
        primaryClient.membershipHistory.push(renewedMembership._id);
        await primaryClient.save({ session });

        // 5. Activity log
        await Activity.create([{
            gymId: gymId,
            type: activityType,
            title: activityType === 'RENEWAL' ? 'Membership Renewed' : 'Advance Renewal',
            description: activityType === 'RENEWAL' ?
                `${primaryClient.name} renewed the ${plan.planName} plan` :
                `${primaryClient.name} pre-paid for ${plan.planName} starting on ${formatDisplayDate(newStartDate)}`,
            amount: amount,
            memberId: primaryClient._id,
            date: today
        }], { session });

        await session.commitTransaction();
        // 6. Messaging (Post-transaction)
        const settings = await Settings.findOne({ gymId });
        if (settings?.whatsapp?.active && settings?.whatsapp?.sendOnRenewal !== false) {
            const gymInfo = await Gym.findById(gymId);
            const params = [primaryClient.name, plan?.planName, formatShortDate(newStartDate), formatShortDate(newEndDate)];
            sendWhatsAppTemplate(`91${primaryClient.phoneNumber}`, "renewal_complete", params, settings?.whatsapp, gymInfo?.name);
        }
        return reply.send({ success: true, data: primaryClient });
    } catch (error: any) {
        await session.abortTransaction();
        console.error('Renewal Error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    } finally {
        session.endSession();
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
        return reply.send({ success: true, data: client });
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getClientById = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;
        const client = await Client.findOne({ _id: id, gymId }).populate({
            path: 'activeMembership',
            select: 'startDate endDate status planName primaryMemberId',
            populate: { path: 'primaryMemberId', select: 'name' }
        }).populate({
            path: 'upcomingMembership',
            select: 'startDate endDate status planName primaryMemberId',
            populate: { path: 'primaryMemberId', select: 'name' }
        }).populate({
            path: 'membershipHistory',
            select: 'startDate endDate status planName totalAmount',
            options: { sort: { startDate: -1 } }
        });

        if (!client) {
            return reply.status(404).send({ success: false, error: "Client not found" });
        }
        return reply.send({ success: true, data: client });
    } catch (error: any) {
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

        // Must only be able to delete if membership is expired (or trial_expired)
        // Adjust if they don't have membership yet but still should be deleted
        if (!['expired', 'trial_expired'].includes(client.membershipStatus) && client.membershipHistory.length > 0) {
            return reply.status(400).send({ success: false, message: 'Cannot delete: Client membership is not expired.' });
        }

        // Process actual deletion using standard findAndDelete or remove.
        // Also might need to clean up dependencies using similar structures as other deletions.
        await Client.findByIdAndDelete(id);

        return reply.send({ success: true, message: 'Client deleted successfully' });
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};
