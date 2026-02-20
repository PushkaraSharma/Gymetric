import { FastifyInstance } from "fastify";
import {
    getAllClients,
    getClientById,
    getClientStats,
    onBoarding,
    renewMembership,
    updateClient,
    deleteClient
} from "../controllers/clientController.js";

export async function clientRoutes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticate);

    // GET /api/client/all
    fastify.get('/all', getAllClients);

    // POST /api/client/add
    fastify.post('/add', onBoarding);

    // PATCH /api/client/update
    fastify.patch('/update', updateClient);

    // GET /api/client/clientInfo?id=...
    fastify.get('/clientInfo', getClientById);

    // GET /api/client/stats
    fastify.get('/stats', getClientStats);

    // PATCH /api/client/renew
    fastify.patch('/renew', renewMembership);

    // DELETE /api/client/delete?id=...
    fastify.delete('/delete', deleteClient);
}