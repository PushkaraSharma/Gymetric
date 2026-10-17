import { getActivities, getDashboardSummary, getRevenueStats } from "../controllers/dashboardController.js";

export async function dashboardRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.get('/summary', getDashboardSummary);
    fastify.get('/revenue', getRevenueStats);
    fastify.get('/activities', getActivities);
}