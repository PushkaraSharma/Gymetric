import 'dotenv/config'
import "./instrument.js";
import { openDatabase } from './src/db/client.js';
import { buildApp } from './src/buildApp.js';
import { PORT } from './src/config/config.js';

// on onboarding or any other time -> use AI to share some insights ( like workout plan etc )
const start = async () => {
    if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL is not defined; using the embedded PGlite database in .data/pglite");
    }
    await openDatabase();

    const app = await buildApp();

    try {
        await app.listen({ port: Number(PORT), host: '0.0.0.0' });
        console.log(`GymKarta server is running on port ${PORT}`);
    } catch (err: any) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
