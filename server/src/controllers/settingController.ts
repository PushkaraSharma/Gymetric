import Settings from "../models/Settings.js";

export const setSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;

        // Fetch existing settings to preserve secrets
        let updateData = { ...request.body, gymId };

        if (updateData.whatsapp) {
            const existingSettings: any = await Settings.findOne({ gymId }).lean();
            if (existingSettings && existingSettings.whatsapp) {
                // Preserve accessToken if not provided
                if (!updateData.whatsapp.accessToken && existingSettings.whatsapp.accessToken) {
                    updateData.whatsapp.accessToken = existingSettings.whatsapp.accessToken;
                }
                // Preserve phoneNumberId if not provided
                if (!updateData.whatsapp.phoneNumberId && existingSettings.whatsapp.phoneNumberId) {
                    updateData.whatsapp.phoneNumberId = existingSettings.whatsapp.phoneNumberId;
                }
                // Preserve headerImageId if not provided (good practice)
                if (!updateData.whatsapp.headerImageId && existingSettings.whatsapp.headerImageId) {
                    updateData.whatsapp.headerImageId = existingSettings.whatsapp.headerImageId;
                }
            }
        }

        const settings = await Settings.findOneAndUpdate(
            { gymId },
            { $set: updateData },
            { new: true, upsert: true, setDefaultsOnInsert: true, projection: { accessToken: 0, phoneNumberId: 0 } }
        );
        return reply.status(200).send({ success: true, data: settings });
    } catch (error: any) {
        console.log(error)
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getSettings = async (request: any, reply: any) => {
    try {
        const gymId = request.user.gymId;
        const rawSettings: any = await Settings.findOne({ gymId }).lean();
        if (!rawSettings) {
            return reply.status(404).send({ success: false, message: 'Settings not found' });
        }
        const hasWhatsappConfigured = !!(rawSettings.whatsapp && rawSettings.whatsapp.phoneNumberId);
        // Remove sensitive field
        if (rawSettings.whatsapp) {
            delete rawSettings.whatsapp.accessToken;
            delete rawSettings.whatsapp.phoneNumberId;
        }
        return reply.status(200).send({
            success: true,
            data: { ...rawSettings, hasWhatsappConfigured }
        });
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};
