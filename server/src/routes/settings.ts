import { setSettings, getSettings } from '../controllers/settingController.js';

export async function settingRoutes(fastify: any) {
    fastify.addHook('onRequest', fastify.authenticate);

    // POST /api/settings/
    fastify.post('/', setSettings);
    fastify.get('/', getSettings);

}