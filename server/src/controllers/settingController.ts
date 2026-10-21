import Settings from "../models/Settings.js";
import { deleteFromCloudinary, getCloudinaryPublicId } from "../utils/cloudinary.js";

export const setSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;

        // Fetch existing settings to preserve secrets
        let updateData = { ...request.body, gymId };

        let previousHeaderUrl: string | undefined;
        if (updateData.whatsapp) {
            updateData.whatsapp.reminderDays = 1;
            const existingSettings: any = await Settings.findOne({ gymId }).lean();
            previousHeaderUrl = existingSettings?.whatsapp?.headerImageUrl;
            if (existingSettings && existingSettings.whatsapp) {
                // Preserve accessToken if not provided
                if (!updateData.whatsapp.accessToken && existingSettings.whatsapp.accessToken) {
                    updateData.whatsapp.accessToken = existingSettings.whatsapp.accessToken;
                }
                // Preserve phoneNumberId if not provided
                if (!updateData.whatsapp.phoneNumberId && existingSettings.whatsapp.phoneNumberId) {
                    updateData.whatsapp.phoneNumberId = existingSettings.whatsapp.phoneNumberId;
                }
                // Preserve the permanent onboarding header URL only when the client omits it.
                // An explicit empty or new value is authoritative (replace / clear).
                if (updateData.whatsapp.headerImageUrl === undefined && existingSettings.whatsapp.headerImageUrl) {
                    updateData.whatsapp.headerImageUrl = existingSettings.whatsapp.headerImageUrl;
                }

                // Preserve headerImageId if not provided (good practice)
                if (!updateData.whatsapp.headerImageId && existingSettings.whatsapp.headerImageId) {
                    updateData.whatsapp.headerImageId = existingSettings.whatsapp.headerImageId;
                }
            }
            if (updateData.whatsapp.active && !updateData.whatsapp.headerImageUrl) {
                return reply.status(400).send({ success: false, message: 'Welcome image required to enable WhatsApp' });
            }
        }

        const settings = await Settings.findOneAndUpdate(
            { gymId },
            { $set: updateData },
            { new: true, upsert: true, setDefaultsOnInsert: true, projection: { accessToken: 0, phoneNumberId: 0 } }
        );

        const nextHeaderUrl = updateData.whatsapp?.headerImageUrl;
        if (previousHeaderUrl && nextHeaderUrl !== undefined && previousHeaderUrl !== nextHeaderUrl) {
            const publicId = getCloudinaryPublicId(previousHeaderUrl);
            if (publicId) {
                deleteFromCloudinary(publicId).catch((err) => {
                    request.log.error({ err }, 'Failed to delete previous WhatsApp header image');
                });
            }
        }

        return reply.status(200).send({ success: true, data: settings });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const setReceiptSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const { receipt } = request.body;
        const existingSettings: any = await Settings.findOne({ gymId }).lean();
        const nextReceipt = {
            ...(existingSettings?.receipt || {}),
            ...(receipt || {}),
        };

        const settings = await Settings.findOneAndUpdate(
            { gymId },
            { $set: { receipt: nextReceipt, gymId } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return reply.status(200).send({ success: true, data: settings?.receipt });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const rawSettings: any = await Settings.findOne({ gymId }).lean();
        if (!rawSettings) {
            return reply.status(200).send({
                success: true,
                data: { ...rawSettings, hasWhatsappConfigured: false }
            });
        }
        const hasWhatsappConfigured = !!(rawSettings.whatsapp && rawSettings.whatsapp.phoneNumberId);
        if (rawSettings.whatsapp) {
            delete rawSettings.whatsapp.accessToken;
            delete rawSettings.whatsapp.phoneNumberId;
        }
        return reply.status(200).send({
            success: true,
            data: { ...rawSettings, hasWhatsappConfigured }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
