import { savePushToken, getPushPrefs, updatePushPrefs } from '../controllers/userController.js';

export async function userRoutes(fastify: any) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/push-token', savePushToken);
    fastify.get('/push-prefs', getPushPrefs);
    fastify.patch('/push-prefs', updatePushPrefs);
}
