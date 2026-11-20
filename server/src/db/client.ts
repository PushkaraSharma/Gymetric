import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import pg from "pg";
import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Tx;

// Live binding: set by openDatabase() before any route is registered.
export let db: Database;
let closeFn: () => Promise<void> = async () => {};

// Works from src/ (tsx) and from dist/ (compiled): walk up to the folder holding drizzle/.
function findUp(relative: string) {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i++) {
        const candidate = path.join(dir, relative);
        if (fs.existsSync(candidate)) return candidate;
        dir = path.dirname(dir);
    }
    throw new Error(`Could not find ${relative} above ${fileURLToPath(import.meta.url)}`);
}

const migrationsFolder = () => findUp(path.join("drizzle", "meta", "_journal.json")).replace(/[\\/]meta[\\/]_journal\.json$/, "");

function pgliteDirectory() {
    const override = process.env.PGLITE_DIR?.trim();
    if (override) return override;
    return path.join(path.dirname(migrationsFolder()), ".data", "pglite");
}

export async function openDatabase(url = process.env.DATABASE_URL): Promise<Database> {
    if (url) {
        const pool = new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
        const pgDb = drizzlePg(pool, { schema });
        await migratePg(pgDb, { migrationsFolder: migrationsFolder() });
        db = pgDb;
        closeFn = () => pool.end();
        return db;
    }
    const dir = pgliteDirectory();
    fs.mkdirSync(dir, { recursive: true });
    const client = new PGlite(dir);
    const liteDb = drizzlePglite(client, { schema });
    await migratePglite(liteDb, { migrationsFolder: migrationsFolder() });
    db = liteDb as unknown as Database;
    closeFn = () => client.close();
    return db;
}

export async function closeDatabase() {
    await closeFn();
}
