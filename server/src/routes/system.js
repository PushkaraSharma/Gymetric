import { performExpiryChecks } from "../controllers/systemControlller.js";

export async function systemRoutes(fastify) {
    // post /api/system/run-expiry-check
    fastify.post('/run-expiry-check', performExpiryChecks);
}