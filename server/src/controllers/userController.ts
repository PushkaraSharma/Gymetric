import User from '../models/User.js';

export const savePushToken = async (request: any, reply: any) => {
    try {
        const userId = request.user.userId;
        const { expoPushToken } = request.body;

        if (!expoPushToken) {
            return reply.status(400).send({ success: false, error: 'Push token is required.' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { expoPushToken },
            { new: true }
        ).select('pushNotificationsEnabled pushPrefs expoPushToken');

        return reply.send({ success: true, data: user });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getPushPrefs = async (request: any, reply: any) => {
    try {
        const user = await User.findById(request.user.userId).select('pushNotificationsEnabled pushPrefs');
        return reply.send({ success: true, data: user });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updatePushPrefs = async (request: any, reply: any) => {
    try {
        const { pushNotificationsEnabled, pushPrefs } = request.body;
        const update: any = {};
        if (pushNotificationsEnabled !== undefined) update.pushNotificationsEnabled = pushNotificationsEnabled;
        if (pushPrefs) update.pushPrefs = pushPrefs;

        const user = await User.findByIdAndUpdate(request.user.userId, update, { new: true })
            .select('pushNotificationsEnabled pushPrefs');

        return reply.send({ success: true, data: user });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
