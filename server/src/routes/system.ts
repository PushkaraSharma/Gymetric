import { FastifyInstance } from "fastify";
import { performExpiryChecks, performPushSummary } from "../controllers/systemController.js";
import { handleWhatsAppWebhook, verifyWhatsAppWebhook } from "../controllers/whatsappController.js";

export async function systemRoutes(fastify: FastifyInstance) {
    fastify.post('/run-expiry-check', performExpiryChecks);
    fastify.post('/run-push-summary', performPushSummary);
    fastify.get('/whatsapp-webhook', verifyWhatsAppWebhook);
    fastify.post('/whatsapp-webhook', handleWhatsAppWebhook);
}