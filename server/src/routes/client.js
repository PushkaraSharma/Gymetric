import { addClient, getAllClients, getClientById, getClientStats } from "../controllers/clientController.js";

export async function clientRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    // GET /api/clients/all?status=active
    fastify.get('/all', getAllClients);

    // POST /api/clients/add
    fastify.post('/add', addClient);

    // PATCH /api/clients/:id
    fastify.patch('/update', addClient);

    // GET /api/clients/clientInfo?id=123
    fastify.get('/clientInfo', getClientById);

    // GET /api/clients/stats
    fastify.get('/stats', getClientStats);
}