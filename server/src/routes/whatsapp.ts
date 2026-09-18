import { FastifyInstance } from "fastify";
import { getWhatsAppLogs, getWhatsAppSummary } from "../controllers/whatsappController.js";

export async function whatsappRoutes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticate);
    fastify.get('/summary', getWhatsAppSummary);
    fastify.get('/logs', getWhatsAppLogs);
}
