import { getDashboardSummary } from "../controllers/dashboardController.js";

export async function dashboardRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    // GET /api/dashboard/summary
    fastify.get('/summary', getDashboardSummary);
}