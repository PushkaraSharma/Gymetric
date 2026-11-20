/**
 * Calls the same read endpoints on the old (Mongo) and new (Postgres) servers for every migrated gym
 * and diffs the JSON. New uuids are mapped back to their Mongo ids through legacy_mongo_id first.
 *
 *   OLD_API_URL=https://old.example.com DATABASE_URL=... JWT_SECRET=... npm run compare:api -- [--gym <mongoGymId>] [--sample 25]
 *
 * NEW_API_URL is optional. Without it the new API runs in-process against DATABASE_URL (or the local PGlite folder).
 * Both servers must share JWT_SECRET: the script signs an old-style token per gym, which also exercises the
 * legacy-token mapping on the new server. Run it while no one is writing (during the cutover freeze).
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { isNotNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { PgTable } from 'drizzle-orm/pg-core';
import { closeDatabase, db, openDatabase } from '../db/client.js';
import { objectIdFromDanglingUuid } from '../db/legacyIds.js';
import {
    activities,
    branchSettings,
    branches,
    members,
    membershipPauses,
    memberships,
    messageLogs,
    organizations,
    packages,
    payments,
    users,
} from '../db/schema.js';

const args = process.argv.slice(2);
const argValue = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const gymArg = argValue('--gym');
const sampleSize = Number(argValue('--sample') ?? 25);
const MAX_PRINTED_DIFFS = 15;

const OLD_API_URL = process.env.OLD_API_URL?.replace(/\/$/, '');
const NEW_API_URL = process.env.NEW_API_URL?.replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET;

type Json = any;
type Fetcher = (path: string, token: string) => Promise<{ status: number; body: Json }>;

const httpFetcher = (base: string): Fetcher => async (path, token) => {
    const res = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
    const text = await res.text();
    let body: Json = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }
    return { status: res.status, body };
};

const injectFetcher = (app: FastifyInstance): Fetcher => async (path, token) => {
    const res = await app.inject({ method: 'GET', url: path, headers: { authorization: `Bearer ${token}` } });
    let body: Json = res.body;
    try { body = res.json(); } catch { /* keep text */ }
    return { status: res.statusCode, body };
};

// uuid -> Mongo id for every imported row.
async function loadIdMap() {
    const tables: (PgTable & { id: any; legacyMongoId: any })[] = [
        organizations, branches, users, branchSettings, packages, members, memberships, membershipPauses, payments, activities, messageLogs,
    ];
    const map = new Map<string, string>();
    for (const table of tables) {
        const rows = await db.select({ id: table.id, legacy: table.legacyMongoId }).from(table).where(isNotNull(table.legacyMongoId));
        for (const r of rows) map.set(r.id as string, r.legacy as string);
    }
    return map;
}

const mapIds = (value: Json, ids: Map<string, string>): Json => {
    if (typeof value === 'string') return ids.get(value) ?? objectIdFromDanglingUuid(value) ?? value;
    if (Array.isArray(value)) return value.map((v) => mapIds(v, ids));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapIds(v, ids)]));
    }
    return value;
};

// Present in some Mongo documents but outside GymKarta's schemas (written by other tools); not migrated.
const IGNORED_KEYS = new Set(['__v', 'attendanceEnabled', 'biometricPin', 'fingerprintStatus', 'fingerprintDeviceSn', 'fingerprintEnrolledAt']);

const stripMongoNoise = (value: Json): Json => {
    if (Array.isArray(value)) return value.map(stripMongoNoise);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).filter(([k]) => !IGNORED_KEYS.has(k)).map(([k, v]) => [k, stripMongoNoise(v)]));
    }
    return value;
};

// Older Mongo documents predate these schema defaults (lean() does not fill them); Postgres always has them.
const DEFAULT_FILLS: Record<string, Json> = {
    pauseHistory: [],
    totalPausedDays: 0,
    isSeeded: false,
    type: 'membership',
    role: 'primary',
    balance: 0,
    onboardingPurpose: 'General Fitness',
    receipt: { footerNote: 'Thank you for training with us!', showGymAddress: true },
    footerNote: 'Thank you for training with us!',
    showGymAddress: true,
    active: true,
    isTrial: false,
    durationInDays: 0,
    durationInMonths: 0,
    planType: 'indivisual',
    membersAllowed: 1,
    index: 0,
    channel: 'whatsapp',
};
const isDefaultFill = (key: string, value: Json) => key in DEFAULT_FILLS && JSON.stringify(DEFAULT_FILLS[key]) === JSON.stringify(value);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
function diff(a: Json, b: Json, path: string, out: string[]) {
    if (out.length > 200) return;
    if (typeof a === 'number' && typeof b === 'number') {
        if (Math.abs(a - b) > 1e-6) out.push(`${path}: old ${a}, new ${b}`);
        return;
    }
    if (typeof a === 'string' && typeof b === 'string' && ISO_DATE.test(a) && ISO_DATE.test(b)) {
        if (new Date(a).getTime() !== new Date(b).getTime()) out.push(`${path}: old ${a}, new ${b}`);
        return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) out.push(`${path}: old has ${a.length} items, new has ${b.length}`);
        for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${path}[${i}]`, out);
        return;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
            // The app treats a null field and a missing one the same way.
            const inA = key in a && a[key] !== null;
            const inB = key in b && b[key] !== null;
            if (!inA && !inB) continue;
            if (!inB) out.push(`${path}.${key}: only in old (${JSON.stringify(a[key]).slice(0, 80)})`);
            else if (!inA) {
                if (!isDefaultFill(key, b[key])) out.push(`${path}.${key}: only in new (${JSON.stringify(b[key]).slice(0, 80)})`);
            } else diff(a[key], b[key], `${path}.${key}`, out);
        }
        return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${path}: old ${JSON.stringify(a)?.slice(0, 80)}, new ${JSON.stringify(b)?.slice(0, 80)}`);
}

// Ties in sort keys have no defined order on either database; break them by _id before diffing.
const byKeys = (...keys: string[]) => (list: Json[]) => [...list].sort((x, y) => {
    for (const k of [...keys, '_id']) {
        const a = x?.[k] ?? '';
        const b = y?.[k] ?? '';
        if (a < b) return -1;
        if (a > b) return 1;
    }
    return 0;
});
const sortData = (sorter: (list: Json[]) => Json[]) => (body: Json) =>
    Array.isArray(body?.data) ? { ...body, data: sorter(body.data) } : body;

const sortField = (body: Json, field: string, sorter: (list: Json[]) => Json[]) =>
    (Array.isArray(body?.data?.[field]) ? { ...body, data: { ...body.data, [field]: sorter(body.data[field]) } } : body);

const normalizers: Record<string, (body: Json) => Json> = {
    // Mongo $group output has no order among equal counts.
    '/api/dashboard/summary': (body) => {
        let out = sortField(body, 'topSellingPlansLast6Months', (list) => [...list].sort((x, y) => y.count - x.count || String(x.planId).localeCompare(String(y.planId))));
        for (const field of ['paymentMethodsToday', 'paymentMethods']) {
            out = sortField(out, field, (list) => [...list].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))));
        }
        return out;
    },
    '/api/client/all': sortData(byKeys('name')),
    '/api/membership/all': sortData(byKeys('index', 'createdAt')),
    '/api/dashboard/activities': (body) => (Array.isArray(body?.data?.items)
        ? { ...body, data: { ...body.data, items: byKeys('date')(body.data.items) } }
        : body),
    '/api/client/clientInfo': (body) => (Array.isArray(body?.data?.membershipHistory)
        ? { ...body, data: { ...body.data, membershipHistory: byKeys('startDate')(body.data.membershipHistory) } }
        : body),
    '/api/client/activity': sortData(byKeys('date', 'type', 'title')),
};
const normalizerFor = (path: string) => normalizers[path.split('?')[0]] ?? ((b: Json) => b);

async function main() {
    if (!OLD_API_URL) throw new Error('OLD_API_URL is required (the Mongo server)');
    if (!JWT_SECRET) throw new Error('JWT_SECRET is required and must match both servers');

    await openDatabase();
    let app: FastifyInstance | undefined;
    let newFetch: Fetcher;
    if (NEW_API_URL) {
        newFetch = httpFetcher(NEW_API_URL);
    } else {
        const { buildApp } = await import('../buildApp.js');
        app = await buildApp();
        newFetch = injectFetcher(app);
    }
    const oldFetch = httpFetcher(OLD_API_URL);

    const ids = await loadIdMap();
    const gymRows = (await db.select().from(branches).where(isNotNull(branches.legacyMongoId)))
        .filter((g) => !gymArg || g.legacyMongoId === gymArg);
    const userRows = await db.select().from(users).where(isNotNull(users.legacyMongoId));

    const istDay = (offset: number) => new Date(Date.now() + 5.5 * 3600_000 + offset * 86_400_000).toISOString().slice(0, 10);
    const today = istDay(0);
    const monthAgo = istDay(-30);

    let totalChecks = 0;
    let failedChecks = 0;
    for (const gym of gymRows) {
        const user = userRows.find((u) => u.branchId === gym.id && u.role === 'admin') ?? userRows.find((u) => u.branchId === gym.id);
        console.log(`\n=== ${gym.name} (${gym.legacyMongoId})`);
        if (!user) {
            console.log('  skipped: no user to sign a token for');
            continue;
        }
        const token = jwt.sign({ userId: user.legacyMongoId, gymId: gym.legacyMongoId, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        const paths = [
            '/api/gym/info',
            '/api/settings',
            '/api/membership/all',
            '/api/client/all',
            '/api/client/stats',
            '/api/dashboard/summary',
            '/api/dashboard/revenue',
            '/api/dashboard/activities?page=1&limit=50',
            `/api/dashboard/activities?from=${monthAgo}&to=${today}&page=1&limit=50`,
            `/api/dashboard/revenue?from=${monthAgo}&to=${today}`,
            '/api/whatsapp/summary',
            '/api/whatsapp/logs?page=1&limit=50',
            '/api/user/push-prefs',
        ];

        const oldClients = await oldFetch('/api/client/all', token);
        const clientList: Json[] = Array.isArray(oldClients.body?.data) ? oldClients.body.data : [];
        const step = Math.max(1, Math.floor(clientList.length / Math.max(1, sampleSize)));
        const sample = clientList.filter((_, i) => i % step === 0).slice(0, sampleSize);
        const legacyToNew = new Map([...ids.entries()].map(([uuid, legacy]) => [legacy, uuid]));
        const perClient: [string, string][] = [];
        for (const c of sample) {
            const newId = legacyToNew.get(c._id);
            perClient.push([`/api/client/clientInfo?id=${c._id}`, `/api/client/clientInfo?id=${newId}`]);
            perClient.push([`/api/client/activity?id=${c._id}`, `/api/client/activity?id=${newId}`]);
        }

        let gymFailures = 0;
        for (const [oldPath, newPath] of [...paths.map((p) => [p, p] as [string, string]), ...perClient]) {
            totalChecks++;
            const [oldRes, newRes] = await Promise.all([oldFetch(oldPath, token), newFetch(newPath, token)]);
            const normalize = normalizerFor(oldPath);
            const oldBody = normalize(stripMongoNoise(oldRes.body));
            const newBody = normalize(mapIds(newRes.body, ids));
            const diffs: string[] = [];
            if (oldRes.status !== newRes.status) diffs.push(`status: old ${oldRes.status}, new ${newRes.status}`);
            diff(oldBody, newBody, '', diffs);
            if (diffs.length) {
                failedChecks++;
                gymFailures++;
                console.log(`  DIFF ${oldPath} (${diffs.length})`);
                for (const d of diffs.slice(0, MAX_PRINTED_DIFFS)) console.log(`      ${d}`);
                if (diffs.length > MAX_PRINTED_DIFFS) console.log(`      ... ${diffs.length - MAX_PRINTED_DIFFS} more`);
            }
        }
        const count = paths.length + perClient.length;
        console.log(`  ${count - gymFailures} of ${count} responses identical (${sample.length} sampled members)`);
    }

    console.log(`\n${totalChecks - failedChecks} of ${totalChecks} responses identical`);
    if (failedChecks) process.exitCode = 1;

    await app?.close();
    await closeDatabase();
}

main().catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await closeDatabase().catch(() => {});
});
