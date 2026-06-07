import { getGymInfo, updateGymInfo, handleSeedDemoData } from "../controllers/gymController.js";

export async function gymRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.get('/info', getGymInfo);
    fastify.patch('/update', updateGymInfo);
    fastify.post('/seed-demo-data', handleSeedDemoData);
}