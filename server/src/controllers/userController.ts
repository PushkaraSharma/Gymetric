import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { serializePushPrefs } from '../db/serializers.js';

const PREF_COLUMNS = {
    expiringToday: 'pushExpiringToday',
    expiringSoon: 'pushExpiringSoon',
    outstandingBalance: 'pushOutstandingBalance',
    dailySummary: 'pushDailySummary',
} as const;

export const savePushToken = async (request: any, reply: any) => {
    try {
        const userId = request.user.userId;
        const { expoPushToken } = request.body;

        if (!expoPushToken) {
            return reply.status(400).send({ success: false, error: 'Push token is required.' });
        }

        const [user] = await db.update(users)
            .set({ expoPushToken, updatedAt: new Date() })
            .where(eq(users.id, userId))
            .returning();

        return reply.send({ success: true, data: user ? { ...serializePushPrefs(user), expoPushToken: user.expoPushToken } : null });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getPushPrefs = async (request: any, reply: any) => {
    try {
        const [user] = await db.select().from(users).where(eq(users.id, request.user.userId)).limit(1);
        return reply.send({ success: true, data: user ? serializePushPrefs(user) : null });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updatePushPrefs = async (request: any, reply: any) => {
    try {
        const { pushNotificationsEnabled, pushPrefs } = request.body;
        const update: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
        if (pushNotificationsEnabled !== undefined) update.pushNotificationsEnabled = !!pushNotificationsEnabled;
        // Mongo replaced the whole pushPrefs object; missing keys fell back to their default (true).
        if (pushPrefs) {
            for (const [key, column] of Object.entries(PREF_COLUMNS)) {
                (update as any)[column] = pushPrefs[key] === undefined ? true : !!pushPrefs[key];
            }
        }

        const [user] = await db.update(users).set(update).where(eq(users.id, request.user.userId)).returning();

        return reply.send({ success: true, data: user ? serializePushPrefs(user) : null });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
