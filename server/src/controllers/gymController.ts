import { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { branches } from '../db/schema.js';
import { serializeGym } from '../db/serializers.js';
import { findBranch } from '../db/queries.js';
import { seedDemoData, clearSeededData } from "../services/seedDemoDataService.js";
import { invalidateClientCaches } from "../utils/cache.js";

const GYM_FIELDS = ['name', 'address', 'ownerName', 'contactNumber', 'email', 'logo'] as const;

export const getGymInfo = async (request: any, reply: any) => {
    try {
        const { gymId } = request.user;
        const gymInfo = await findBranch(db, gymId);
        if (!gymInfo) {
            return reply.status(404).send({ success: false, error: 'Gym not found' });
        }
        return reply.send({ success: true, data: serializeGym(gymInfo) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateGymInfo = async (request: any, reply: any) => {
    try {
        const { gymId } = request.user;
        const body = request.body || {};
        const update: Partial<typeof branches.$inferInsert> = { updatedAt: new Date() };
        for (const key of GYM_FIELDS) {
            if (body[key] !== undefined) (update as any)[key] = body[key];
        }
        const [updatedGym] = await db.update(branches).set(update).where(eq(branches.id, gymId)).returning();
        if (!updatedGym) {
            return reply.status(404).send({ success: false, message: 'Gym not found' });
        }
        return reply.send({ success: true, data: serializeGym(updatedGym) });

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
