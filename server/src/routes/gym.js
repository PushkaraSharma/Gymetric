import { getGymInfo } from "../controllers/gymController.js";

export async function gymRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    // GET /api/gym/info
    fastify.get('/info', getGymInfo);
}