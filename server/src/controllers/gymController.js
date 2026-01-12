import Gym from "../models/Gym.js";

export const getGymInfo = async (request, reply) => {
    try {
        const { gymId } = request.user;
        const gymInfo = await Gym.findOne({_id: gymId });
        if(!gymInfo){
            return reply.status(404).send({ success: false, error: 'Gym not found' });
        }
        return reply.send({ success: true, data: gymInfo });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};