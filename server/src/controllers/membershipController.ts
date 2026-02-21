import { FastifyRequest, FastifyReply } from 'fastify';
import Memberships from "../models/Memberships.js";

export const getAllMemberships = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const memberships = await Memberships.find({ gymId }).sort({ index: 1 });
        return reply.status(200).send({ success: true, data: memberships });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const addMembership = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { planName, durationInDays, durationInMonths, price, isTrial, description, active, planType, membersAllowed, index } = request.body;
        const membership = await Memberships.create({
            planName, durationInDays, durationInMonths, price, isTrial, active, gymId, description, planType, membersAllowed
        })
        return reply.status(201).send({ success: true, data: membership });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateMembership = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const updatedData = request.body;
        const updatedMembership = await Memberships.findOneAndUpdate(
            { _id: updatedData?.id, gymId },
            { $set: updatedData },
            { new: true, runValidators: true }
        );
        if (!updatedMembership) {
            return reply.status(404).send({ success: false, message: 'Membership not found' });
        }
        return reply.send({ success: true, data: updatedMembership });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};


export const deleteMembership = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;
        const deletedMembership = await Memberships.findOneAndDelete({ _id: id, gymId });
        if (!deletedMembership) {
            return reply.status(404).send({ success: false, message: 'Membership not found or unauthorized' });
        }
        return reply.send({ success: true, data: await Memberships.find({ gymId }).sort({ index: 1 }) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
