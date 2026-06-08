import { setSettings, getSettings, setReceiptSettings } from '../controllers/settingController.js';

export async function settingRoutes(fastify: any) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/', setSettings);
    fastify.get('/', getSettings);
    fastify.post('/receipt', setReceiptSettings);
}