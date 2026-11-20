import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { packages } from '../db/schema.js';
import { serializePlan } from '../db/serializers.js';
import { validId } from '../db/queries.js';

const listPlans = async (gymId: string) => {
    const rows = await db.select().from(packages).where(eq(packages.branchId, gymId)).orderBy(asc(packages.sortIndex), asc(packages.createdAt));
    return rows.map(serializePlan);
};

const toInt = (value: unknown) => (value === undefined || value === null || value === '' ? undefined : Math.round(Number(value)));
const toNum = (value: unknown) => (value === undefined || value === null || value === '' ? undefined : Number(value));

// Body keys the app sends -> package columns. Unknown keys are ignored, like the Mongoose schema did.
const planFields = (body: any) => {
    const fields: Partial<typeof packages.$inferInsert> = {};
    if (body.planName !== undefined) fields.planName = body.planName;
    if (body.durationInDays !== undefined) fields.durationInDays = toInt(body.durationInDays) ?? 0;
    if (body.durationInMonths !== undefined) fields.durationInMonths = toInt(body.durationInMonths) ?? 0;
    if (body.price !== undefined) fields.price = toNum(body.price);
    if (body.isTrial !== undefined) fields.isTrial = !!body.isTrial;
    if (body.planType !== undefined) fields.planType = body.planType;
    if (body.membersAllowed !== undefined) fields.membersAllowed = toInt(body.membersAllowed) ?? 1;
    if (body.description !== undefined) fields.description = body.description;
    if (body.active !== undefined) fields.active = !!body.active;
    if (body.index !== undefined) fields.sortIndex = toInt(body.index) ?? 0;
    return fields;
};

export const getAllMemberships = async (request: any, reply: any) => {
    try {
        return reply.status(200).send({ success: true, data: await listPlans(request.user.gymId) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const addMembership = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const fields = planFields(request.body);
        // `index` was never persisted on create.
        delete fields.sortIndex;
        if (!fields.planName || fields.price === undefined || Number.isNaN(fields.price)) {
            return reply.status(500).send({ success: false, error: 'Memberships validation failed: planName and price are required' });
        }
        const [created] = await db.insert(packages).values({
            ...fields,
            planName: fields.planName,
            price: fields.price,
            branchId: gymId,
        }).returning();
        return reply.status(201).send({ success: true, data: serializePlan(created) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateMembership = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const id = validId(request.body?.id);
        const fields = planFields(request.body || {});
        const [updated] = id
            ? Object.keys(fields).length
                ? await db.update(packages).set(fields).where(and(eq(packages.id, id), eq(packages.branchId, gymId))).returning()
                : await db.select().from(packages).where(and(eq(packages.id, id), eq(packages.branchId, gymId)))
            : [];
        if (!updated) {
            return reply.status(404).send({ success: false, message: 'Membership not found' });
        }
        return reply.send({ success: true, data: serializePlan(updated) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};


export const deleteMembership = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const id = validId(request.query?.id);
        const [deleted] = id
            ? await db.delete(packages).where(and(eq(packages.id, id), eq(packages.branchId, gymId))).returning()
            : [];
        if (!deleted) {
            return reply.status(404).send({ success: false, message: 'Membership not found or unauthorized' });
        }
        return reply.send({ success: true, data: await listPlans(gymId) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
