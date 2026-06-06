import { FastifyInstance } from "fastify";
import {
    getAllClients,
    getClientById,
    getClientStats,
    getClientActivity,
    onBoarding,
    renewMembership,
    updateClient,
    deleteClient,
    collectPayment,
    amendMembership,
    pauseMembership,
    resumeMembership,
} from "../controllers/clientController.js";

export async function clientRoutes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.get('/all', getAllClients);
    fastify.post('/add', onBoarding);
    fastify.patch('/update', updateClient);
    fastify.get('/clientInfo', getClientById);
    fastify.get('/stats', getClientStats);
    fastify.get('/activity', getClientActivity);
    fastify.patch('/renew', renewMembership);
    fastify.post('/collect-payment', collectPayment);
    fastify.patch('/membership/amend', amendMembership);
    fastify.post('/membership/pause', pauseMembership);
    fastify.post('/membership/resume', resumeMembership);
    fastify.delete('/delete', deleteClient);
}
