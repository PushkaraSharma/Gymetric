import { setSettings } from '../controllers/settingController.js';

export async function settingRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    // POST /api/settings/
    fastify.post('/', setSettings);

}