import { requireFeature, requirePermission as need } from '../services/access.js';
import { setSettings, getSettings, setReceiptSettings } from '../controllers/settingController.js';

export async function settingRoutes(fastify: any) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/', { preHandler: [requireFeature('whatsapp'), need('whatsapp.settings')] }, setSettings);
    fastify.get('/', getSettings);
    fastify.post('/receipt', { preHandler: need('settings.branch') }, setReceiptSettings);
}