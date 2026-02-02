import 'dotenv/config'
import fastify, { FastifyInstance } from 'fastify';
import { authRoutes } from './src/routes/auth.js';
import { clientRoutes } from './src/routes/client.js';
import { membershipRoutes } from './src/routes/membership.js';
import authMiddleware from './src/middleware/authenticate.js';
import { connectDB } from './src/config/connect.js';
import { PORT } from './src/config/config.js';
import { dashboardRoutes } from './src/routes/dashboard.js';
import { gymRoutes } from './src/routes/gym.js';
import { systemRoutes } from './src/routes/system.js';
import "./instrument.js";
import * as Sentry from '@sentry/node';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { settingRoutes } from './src/routes/settings.js';
import { uploadRoutes } from './src/routes/upload.js';

// on onboarding or any other time -> use AI to share some insights ( like workout plan etc )
const start = async () => {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not defined");
        process.exit(1);
    }
    await connectDB(process.env.MONGO_URI);

    const app: FastifyInstance = fastify({ logger: false });

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

    app.setErrorHandler((error: any, request: any, reply: any) => {
        Sentry.captureException(error);
        console.error('Fastify Error:', error);
        reply.status(500).send({ error: 'Internal Server Error', message: error.message });
    });

    try {
        await app.listen({ port: Number(PORT), host: '0.0.0.0' });
        console.log(`Gymetric server is running on port ${PORT}`);
    } catch (err: any) {
        app.log.error(err);
        process.exit(1);
    }
};

start();