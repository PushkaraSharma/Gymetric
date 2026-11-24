import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { branchSettings } from '../db/schema.js';
import { serializeSettings } from '../db/serializers.js';
import { findSettings } from '../db/queries.js';
import { deleteFromCloudinary, getCloudinaryPublicId } from "../utils/cloudinary.js";

type SettingsInsert = typeof branchSettings.$inferInsert;

const REMINDER_DAYS = [1, 2, 3, 5, 7] as const;
// Days before the end date that the expiry reminder goes out. Anything else falls back to 1.
const reminderDaysOf = (value: unknown) => {
    const days = Number(value);
    return (REMINDER_DAYS as readonly number[]).includes(days) ? days : 1;
};

// Saving `whatsapp` replaces the whole subdocument, as Mongo `$set` did: omitted keys go back to defaults.
const whatsappColumns = (w: any): Partial<SettingsInsert> => ({
    whatsappAccessToken: w.accessToken ?? null,
    whatsappPhoneNumberId: w.phoneNumberId ?? null,
    whatsappActive: w.active === undefined ? false : !!w.active,
    whatsappHeaderImageUrl: w.headerImageUrl ?? null,
    whatsappHeaderImageId: w.headerImageId ?? null,
    whatsappReminderDays: reminderDaysOf(w.reminderDays),
    whatsappSendOnOnboarding: w.sendOnOnboarding === undefined ? true : !!w.sendOnOnboarding,
    whatsappSendOnRenewal: w.sendOnRenewal === undefined ? true : !!w.sendOnRenewal,
    whatsappSendOnExpiry: w.sendOnExpiry === undefined ? true : !!w.sendOnExpiry,
    whatsappSendOnReminder: w.sendOnReminder === undefined ? true : !!w.sendOnReminder,
});

const receiptColumns = (r: any): Partial<SettingsInsert> => {
    const out: Partial<SettingsInsert> = {};
    if (r.logo !== undefined) out.receiptLogo = r.logo ?? null;
    if (r.signature !== undefined) out.receiptSignature = r.signature ?? null;
    if (r.footerNote !== undefined) out.receiptFooterNote = r.footerNote ?? '';
    if (r.showGymAddress !== undefined) out.receiptShowGymAddress = !!r.showGymAddress;
    return out;
};

const upsertSettings = async (gymId: string, values: Partial<SettingsInsert>) => {
    const [row] = await db.insert(branchSettings)
        .values({ ...values, branchId: gymId })
        .onConflictDoUpdate({ target: branchSettings.branchId, set: { ...values, updatedAt: new Date() } })
        .returning();
    return row;
};

export const setSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const body = request.body || {};
        const values: Partial<SettingsInsert> = {};

        let previousHeaderUrl: string | undefined;
        let nextHeaderUrl: string | undefined;
        if (body.whatsapp) {
            const whatsapp = { ...body.whatsapp };
            const existing = await findSettings(db, gymId);
            previousHeaderUrl = existing?.whatsappHeaderImageUrl ?? undefined;
            if (existing) {
                // Preserve secrets and images the client omits. An explicit empty header URL clears it.
                if (!whatsapp.accessToken && existing.whatsappAccessToken) whatsapp.accessToken = existing.whatsappAccessToken;
                if (!whatsapp.phoneNumberId && existing.whatsappPhoneNumberId) whatsapp.phoneNumberId = existing.whatsappPhoneNumberId;
                if (whatsapp.headerImageUrl === undefined && existing.whatsappHeaderImageUrl) whatsapp.headerImageUrl = existing.whatsappHeaderImageUrl;
                if (!whatsapp.headerImageId && existing.whatsappHeaderImageId) whatsapp.headerImageId = existing.whatsappHeaderImageId;
            }
            if (whatsapp.active && !whatsapp.headerImageUrl) {
                return reply.status(400).send({ success: false, message: 'Welcome image required to enable WhatsApp' });
            }
            nextHeaderUrl = whatsapp.headerImageUrl;
            Object.assign(values, whatsappColumns(whatsapp));
        }
        if (body.receipt) Object.assign(values, receiptColumns(body.receipt));

        const settings = await upsertSettings(gymId, values);

        if (previousHeaderUrl && nextHeaderUrl !== undefined && previousHeaderUrl !== nextHeaderUrl) {
            const publicId = getCloudinaryPublicId(previousHeaderUrl);
            if (publicId) {
                deleteFromCloudinary(publicId).catch((err) => {
                    request.log.error({ err }, 'Failed to delete previous WhatsApp header image');
                });
            }
        }

        return reply.status(200).send({ success: true, data: serializeSettings(settings) });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const setReceiptSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { receipt } = request.body || {};
        const settings = await upsertSettings(gymId, receiptColumns(receipt || {}));
        return reply.status(200).send({ success: true, data: serializeSettings(settings).receipt });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const settings = await findSettings(db, gymId);
        if (!settings) {
            return reply.status(200).send({
                success: true,
                data: { hasWhatsappConfigured: false }
            });
        }
        return reply.status(200).send({
            success: true,
            data: { ...serializeSettings(settings), hasWhatsappConfigured: !!settings.whatsappPhoneNumberId }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
