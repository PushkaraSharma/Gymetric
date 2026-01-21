import { performExpiryChecks } from "../controllers/systemControlller.js";

export async function systemRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    // post /api/system/run-expiry-check
    fastify.post('/run-expiry-check', performExpiryChecks);
}