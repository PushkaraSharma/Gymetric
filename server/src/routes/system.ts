import { FastifyInstance } from "fastify";
import { performExpiryChecks } from "../controllers/systemController.js";

export async function systemRoutes(fastify: FastifyInstance) {
    // post /api/system/run-expiry-check
    fastify.post('/run-expiry-check', performExpiryChecks);
}