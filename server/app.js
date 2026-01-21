import 'dotenv/config'
import fastify from 'fastify';
import {authRoutes} from './src/routes/auth.js';
import {clientRoutes} from './src/routes/client.js';
import {membershipRoutes} from './src/routes/membership.js';
import authMiddleware from './src/middleware/authenticate.js';
import { connectDB } from './src/config/connect.js';
import { PORT } from './src/config/config.js';
import { dashboardRoutes } from './src/routes/dashboard.js';
import { gymRoutes } from './src/routes/gym.js';
import { systemRoutes } from './src/routes/system.js';
import "./instrument.js";
import * as Sentry from '@sentry/node';

const start = async() => {
    await connectDB(process.env.MONGO_URI);
    const app = fastify();
    Sentry.setupFastifyErrorHandler(app);
    app.register(authMiddleware);
    app.register(authRoutes, {prefix: '/api/auth'});
    app.register(clientRoutes, {prefix: '/api/client'});
    app.register(membershipRoutes, {prefix: '/api/membership'});
    app.register(dashboardRoutes, {prefix: '/api/dashboard'});
    app.register(gymRoutes, {prefix: '/api/gym'});
    app.register(systemRoutes, {prefix: '/api/system'});
    app.listen({port: PORT, host: '0.0.0.0'}, (err, addr) => {
        if(err){
            console.log(err)
        }else{
            console.log("Gymetric server is running")
        }
    });
    app.get("/debug-sentry-iu", function mainHandler(req, res) {
  throw new Error("My first Sentrykh wkeihfi  error!");
});
};

start();