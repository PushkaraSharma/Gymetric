import fastify, { FastifyInstance } from 'fastify';
import * as Sentry from '@sentry/node';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import authMiddleware from './middleware/authenticate.js';
import { authRoutes } from './routes/auth.js';
import { clientRoutes } from './routes/client.js';
import { membershipRoutes } from './routes/membership.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { gymRoutes } from './routes/gym.js';
import { systemRoutes } from './routes/system.js';
import { settingRoutes } from './routes/settings.js';
import { uploadRoutes } from './routes/upload.js';
import { userRoutes } from './routes/user.js';
import { whatsappRoutes } from './routes/whatsapp.js';

// Expects openDatabase() to have run. Used by app.ts and by the in-process smoke test.
export async function buildApp(): Promise<FastifyInstance> {
    const app: FastifyInstance = fastify({
        logger: {
            level: 'error'
        }
    });

    await app.register(cors, { origin: true });
    await app.register(multipart, {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit
        }
    });

    Sentry.setupFastifyErrorHandler(app);

    // Auth middleware
    await app.register(authMiddleware);

    app.get('/health', async () => ({ status: 'ok' }));

    // Routes
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.register(clientRoutes, { prefix: '/api/client' });
    await app.register(membershipRoutes, { prefix: '/api/membership' });
    await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
    await app.register(gymRoutes, { prefix: '/api/gym' });
    await app.register(systemRoutes, { prefix: '/api/system' });
    await app.register(settingRoutes, { prefix: '/api/settings' });
    await app.register(uploadRoutes, { prefix: '/api/upload' });
    await app.register(userRoutes, { prefix: '/api/user' });
    await app.register(whatsappRoutes, { prefix: '/api/whatsapp' });

    app.setErrorHandler((error: any, request: any, reply: any) => {
        Sentry.captureException(error);
        console.error('Fastify Error:', error);
        reply.status(500).send({ error: 'Internal Server Error', message: error.message });
    });

    return app;
}
