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
    upgradeOptions,
    upgradeMembership,
    editPayment,
    deletePayment,
} from "../controllers/clientController.js";
import { requirePermission as need } from "../services/access.js";

export async function clientRoutes(fastify: any) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.get('/all', { preHandler: need('clients.view') }, getAllClients);
    fastify.post('/add', { preHandler: need('clients.create') }, onBoarding);
    fastify.patch('/update', { preHandler: need('clients.edit') }, updateClient);
    fastify.get('/clientInfo', { preHandler: need('clients.view') }, getClientById);
    fastify.get('/stats', { preHandler: need('clients.view') }, getClientStats);
    fastify.get('/activity', { preHandler: need('clients.view') }, getClientActivity);
    fastify.patch('/renew', { preHandler: need('clients.renew') }, renewMembership);
    fastify.post('/collect-payment', { preHandler: need('clients.collect') }, collectPayment);
    fastify.patch('/membership/amend', { preHandler: need('clients.edit') }, amendMembership);
    fastify.post('/membership/pause', { preHandler: need('clients.freeze') }, pauseMembership);
    fastify.post('/membership/resume', { preHandler: need('clients.freeze') }, resumeMembership);
    fastify.get('/upgrade/options', { preHandler: need('clients.upgrade') }, upgradeOptions);
    fastify.post('/upgrade', { preHandler: need('clients.upgrade') }, upgradeMembership);
    fastify.delete('/delete', { preHandler: need('clients.archive') }, deleteClient);
    // Same paths as CoreWave's invoice edit/delete; a GymKarta bill is a single payment line.
    fastify.patch('/:id/payments/:paymentId', { preHandler: need('clients.edit') }, editPayment);
    fastify.delete('/:id/payments/:paymentId', { preHandler: need('data.delete') }, deletePayment);
}
