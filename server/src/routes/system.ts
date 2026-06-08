import { FastifyInstance } from "fastify";
import { performExpiryChecks, performPushSummary } from "../controllers/systemController.js";

export async function systemRoutes(fastify: FastifyInstance) {
    fastify.post('/run-expiry-check', performExpiryChecks);
    fastify.post('/run-push-summary', performPushSummary);
}