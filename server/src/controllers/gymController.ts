import { FastifyRequest, FastifyReply } from 'fastify';
import Gym from "../models/Gym.js";

export const getGymInfo = async (request: any, reply: any) => {
    try {
        const { gymId } = request.user;
        const gymInfo = await Gym.findOne({ _id: gymId });
        if (!gymInfo) {
            return reply.status(404).send({ success: false, error: 'Gym not found' });
        }
        return reply.send({ success: true, data: gymInfo });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateGymInfo = async (request: any, reply: any) => {
    try {
        const { gymId } = request.user;
        const updatedData = request.body;
        const updatedGym = await Gym.findOneAndUpdate(
            { _id: gymId },
            { $set: updatedData },
            { new: true, runValidators: true }
        );
        if (!updatedGym) {
            return reply.status(404).send({ success: false, message: 'Gym not found' });
        }
        return reply.send({ success: true, data: updatedGym });

    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
}