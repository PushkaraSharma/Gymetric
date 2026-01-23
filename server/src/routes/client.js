import { getAllClients, getClientById, getClientStats, onBoarding, renewMembership, updateClient } from "../controllers/clientController.js";

export async function clientRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    // GET /api/clients/all?status=active
    fastify.get('/all', getAllClients);

    // POST /api/clients/add
    fastify.post('/add', onBoarding);

    // PATCH /api/clients
    fastify.patch('/update', updateClient);

    // GET /api/clients/clientInfo?id=123
    fastify.get('/clientInfo', getClientById);

    // GET /api/clients/stats
    fastify.get('/stats', getClientStats);

    //PATCH /api/clients/renew
    fastify.patch('/renew', renewMembership);
}