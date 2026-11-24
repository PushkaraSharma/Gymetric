import { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { branches, branchSettings, users } from '../db/schema.js';
import { serializeGym } from '../db/serializers.js';
import { findBranch } from '../db/queries.js';
import { accessOf, can, forbid } from '../services/access.js';
import { displayName } from './authController.js';
import { seedDemoData, clearSeededData } from "../services/seedDemoDataService.js";
import { invalidateClientCaches } from "../utils/cache.js";

const GYM_FIELDS = ['name', 'address', 'ownerName', 'contactNumber', 'email', 'logo', 'website', 'gstin', 'timings'] as const;
const RECEIPT_FIELDS = ['receiptLogo', 'receiptSignature', 'receiptFooterNote', 'receiptShowGymAddress'] as const;

const receiptOf = async (gymId: string) => {
    const [row] = await db.select({
        receiptLogo: branchSettings.receiptLogo,
        receiptSignature: branchSettings.receiptSignature,
        receiptFooterNote: branchSettings.receiptFooterNote,
        receiptShowGymAddress: branchSettings.receiptShowGymAddress,
    }).from(branchSettings).where(eq(branchSettings.branchId, gymId)).limit(1);
    return row ?? null;
};

export const getGymInfo = async (request: any, reply: any) => {
    try {
        const { gymId, userId } = request.user;
        const gymInfo = await findBranch(db, gymId);
        if (!gymInfo) {
            return reply.status(404).send({ success: false, error: 'Gym not found' });
        }
        const access = accessOf(request);
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const viewerName = user ? await displayName(user, gymInfo) : gymInfo.ownerName;
        const viewer = {
            userId,
            name: viewerName,
            photo: user?.photo ?? null,
            phoneNumber: user?.phoneNumber ?? null,
            roleKey: access?.roleKey ?? 'owner',
            roleName: access?.roleName ?? 'Owner',
            permissions: access?.permissions ?? [],
        };
        return reply.send({
            success: true,
            data: {
                ...serializeGym(gymInfo),
                receipt: await receiptOf(gymId),
                // viewerRole/viewerName kept for app builds released before `viewer`.
                viewerRole: access?.roleKey === 'owner' ? 'admin' : access?.roleKey ?? 'admin',
                viewerName,
                viewer,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateGymInfo = async (request: any, reply: any) => {
    try {
        const { gymId } = request.user;
        if (!can(request, 'settings.gym')) return forbid(reply);
        const body = request.body || {};
        const update: Partial<typeof branches.$inferInsert> = { updatedAt: new Date() };
        for (const key of GYM_FIELDS) {
            if (body[key] !== undefined) (update as any)[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
        }
        if (update.name === '') return reply.status(400).send({ success: false, message: 'Enter the gym name' });
        const [updatedGym] = await db.update(branches).set(update).where(eq(branches.id, gymId)).returning();
        if (!updatedGym) {
            return reply.status(404).send({ success: false, message: 'Gym not found' });
        }
        const receiptBody = body.receipt || {};
        const receipt: Record<string, unknown> = {};
        for (const key of RECEIPT_FIELDS) {
            if (receiptBody[key] !== undefined) receipt[key] = receiptBody[key];
        }
        if (Object.keys(receipt).length) {
            await db.insert(branchSettings)
                .values({ branchId: gymId, ...receipt })
                .onConflictDoUpdate({ target: branchSettings.branchId, set: { ...receipt, updatedAt: new Date() } });
        }
        return reply.send({ success: true, data: { ...serializeGym(updatedGym), receipt: await receiptOf(gymId) } });

    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const handleSeedDemoData = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        if (accessOf(request)?.roleKey !== 'owner') return forbid(reply);
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
