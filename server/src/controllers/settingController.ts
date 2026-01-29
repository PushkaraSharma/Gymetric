import Settings from "../models/Settings.js";

export const setSettings = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const settings = await Settings.create({
            gymId: gymId,
            ...request.body
        });
        return reply.status(200).send({ success: true, data: settings });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};
