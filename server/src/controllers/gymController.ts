import { FastifyRequest, FastifyReply } from 'fastify';
import Gym from "../models/Gym.js";
import { seedDemoData, clearSeededData } from "../services/seedDemoDataService.js";
import { invalidateClientCaches } from "../utils/cache.js";

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
};

export const handleSeedDemoData = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const { action } = request.body as { action: 'seed' | 'clear' };

        if (!action || !['seed', 'clear'].includes(action)) {
            return reply.status(400).send({ success: false, error: 'Invalid action. Use "seed" or "clear".' });
        }

        const result = action === 'clear'
            ? await clearSeededData(gymId)
            : await seedDemoData(gymId);

        invalidateClientCaches(String(gymId));

        return reply.send({ success: true, data: result });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};