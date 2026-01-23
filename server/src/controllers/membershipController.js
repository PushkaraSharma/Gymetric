import Memberships from "../models/Memberships.js";

export const getAllMemberships = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const memberships = await Memberships.find({ gymId });
        return reply.status(200).send({ success: true, data: memberships });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const addMembership = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { planName, durationInDays,durationInMonths, price, isTrial, description, active, planType, membersAllowed } = request.body;
        const membership = await Memberships.create({
            planName, durationInDays, durationInMonths, price, isTrial, active, gymId, description, planType, membersAllowed
        })
        return reply.status(201).send({ success: true, data: membership });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateMembership = async (request, reply) => {
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
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

