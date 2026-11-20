/**
 * Runs every write flow the app uses against a throwaway database, in-process.
 *
 *   npm run smoke:writes                                  # fresh embedded PGlite in a temp folder
 *   SMOKE_DATABASE_URL=postgres://.../scratch npm run smoke:writes
 *
 * Never point SMOKE_DATABASE_URL at a real gym database: the run creates and deletes data.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import type { FastifyInstance } from 'fastify';
import { closeDatabase, db, openDatabase } from '../db/client.js';
import { branches, users } from '../db/schema.js';
import { buildApp } from '../buildApp.js';

dayjs.extend(utc);
dayjs.extend(timezone);

process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke_secret';
process.env.CRON_SECRET = 'smoke_cron';

const failures: string[] = [];
let passed = 0;
const check = (condition: unknown, label: string, detail?: unknown) => {
    if (condition) {
        passed++;
    } else {
        failures.push(label);
        console.error(`  FAIL ${label}`, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : '');
    }
};

const istDate = (offsetDays = 0, from?: string | Date) =>
    dayjs(from ?? new Date()).tz('Asia/Kolkata').add(offsetDays, 'day').format('YYYY-MM-DD');

async function main() {
    const scratchUrl = process.env.SMOKE_DATABASE_URL?.trim() || '';
    if (scratchUrl && scratchUrl === process.env.DATABASE_URL) {
        throw new Error('SMOKE_DATABASE_URL must not be the same as DATABASE_URL');
    }
    let tempDir: string | undefined;
    if (!scratchUrl) {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymkarta-smoke-'));
        process.env.PGLITE_DIR = tempDir;
    }
    await openDatabase(scratchUrl);
    const app = await buildApp();

    try {
        await run(app);
    } finally {
        await app.close();
        await closeDatabase();
        if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log(`\n${passed} checks passed, ${failures.length} failed`);
    if (failures.length) process.exitCode = 1;
}

async function run(app: FastifyInstance) {
    let token = '';
    const call = async (method: string, url: string, payload?: unknown, authToken = token) => {
        const res = await app.inject({
            method: method as any,
            url,
            payload: payload as any,
            headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
        });
        let body: any;
        try { body = res.json(); } catch { body = res.body; }
        return { status: res.statusCode, body };
    };

    console.log('auth');
    const suffix = Date.now().toString(36);
    const username = `smoke_${suffix}`;
    let res = await call('POST', '/api/auth/setup', {
        gymName: 'Smoke Gym', contactNumber: '9000000000', adminName: 'Owner', username, password: 'secret1', gymAddress: 'Somewhere',
    });
    check(res.status === 201, 'setup gym', res.body);
    res = await call('POST', '/api/auth/login', { username, password: 'secret1' });
    check(res.status === 200 && res.body.data?.token, 'login', res.body);
    token = res.body.data.token;
    res = await call('POST', '/api/auth/login', { username, password: 'wrong' });
    check(res.status === 401, 'login with wrong password is 401');
    res = await call('POST', '/api/auth/reset-password', { oldPassword: 'secret1', newPassword: 'secret2' });
    check(res.status === 200, 'reset password', res.body);
    res = await call('POST', '/api/auth/check-user', { phoneNumber: '9999999999' });
    check(res.status === 200 && res.body.data.exists === false, 'check-user unknown phone');
    res = await call('GET', '/api/gym/info', undefined, '');
    check(res.status === 401, 'missing token is 401');

    console.log('gym and plans');
    res = await call('GET', '/api/gym/info');
    check(res.status === 200 && res.body.data?.name === 'Smoke Gym', 'gym info', res.body);
    res = await call('PATCH', '/api/gym/update', { name: 'Smoke Gym 2', ownerName: 'Owner 2' });
    check(res.status === 200 && res.body.data?.name === 'Smoke Gym 2', 'gym update', res.body);

    res = await call('POST', '/api/membership/add', { planName: 'Monthly', durationInMonths: 1, durationInDays: 0, price: 1000 });
    check(res.status === 200 || res.status === 201, 'add plan', res.body);
    res = await call('POST', '/api/membership/add', { planName: 'Couple', durationInMonths: 3, durationInDays: 0, price: 5000, planType: 'couple', membersAllowed: 2 });
    check(res.status === 200 || res.status === 201, 'add couple plan', res.body);
    res = await call('GET', '/api/membership/all');
    const plans = res.body.data ?? [];
    check(res.status === 200 && plans.length === 2, 'list plans', res.body);
    const monthly = plans.find((p: any) => p.planName === 'Monthly');
    const couple = plans.find((p: any) => p.planName === 'Couple');
    check(monthly?._id && monthly.gymId, 'plan has _id and gymId', monthly);
    res = await call('PATCH', '/api/membership/update', { id: monthly._id, price: 1200 });
    check(res.status === 200, 'update plan', res.body);

    console.log('onboarding');
    res = await call('POST', '/api/client/add', {
        primaryDetails: { name: 'Asha', phoneNumber: '9100000001', gender: 'female', age: 30 },
        dependents: [{ name: 'Ravi', phoneNumber: '9100000002', gender: 'male' }],
        planId: couple._id, method: 'cash', amount: 2000, amountReceived: 1500, startDate: istDate(0),
    });
    check(res.status === 201, 'onboard with dependent', res.body);
    const primary = res.body.data;
    check(primary?._id && primary.balance === 500, 'onboard balance is unpaid part', primary);
    check(typeof primary?.activeMembership === 'string', 'onboard response has activeMembership id', primary);

    res = await call('POST', '/api/client/add', {
        primaryDetails: { name: 'Asha again', phoneNumber: '9100000001' }, planId: monthly._id, method: 'cash', amount: 1000,
    });
    check(res.status >= 400, 'duplicate phone in same gym is rejected', res.body);

    res = await call('GET', '/api/client/all');
    check(res.status === 200 && res.body.data.length === 2, 'client list has both members', res.body);
    const dependent = res.body.data.find((c: any) => c.name === 'Ravi');
    check(dependent?.role === 'dependent' && dependent.activeMembership?._id === primary.activeMembership, 'dependent shares membership', dependent);

    res = await call('GET', `/api/client/clientInfo?id=${primary._id}`);
    const info = res.body.data;
    check(res.status === 200, 'clientInfo', res.body);
    check(info?.activeMembership?.primaryMemberId?.name === 'Asha', 'clientInfo populates payer', info?.activeMembership);
    check(info?.paymentHistory?.length === 1 && info.paymentHistory[0].amount === 1500, 'clientInfo payment history', info?.paymentHistory);
    check(info?.membershipHistory?.length === 1, 'clientInfo membership history', info?.membershipHistory);
    res = await call('GET', `/api/client/clientInfo?id=${dependent._id}`);
    check(res.body.data?.membershipHistory?.length === 1, 'dependent membership history');
    res = await call('GET', '/api/client/clientInfo?id=not-an-id');
    check(res.status === 404, 'malformed id is 404', res.body);

    console.log('payments');
    res = await call('POST', '/api/client/collect-payment', { clientId: primary._id, amount: 900, method: 'upi' });
    check(res.status === 400, 'cannot collect more than balance', res.body);
    res = await call('POST', '/api/client/collect-payment', { clientId: primary._id, amount: 500, method: 'upi', remarks: 'rest' });
    check(res.status === 200 && res.body.data.balance === 0, 'collect balance', res.body);

    res = await call('GET', '/api/client/stats');
    check(res.body.data?.totalClients === 2 && res.body.data.activeMembers === 2 && res.body.data.clientsWithBalance === 0, 'client stats', res.body);

    console.log('pause and resume');
    const membershipId = primary.activeMembership;
    res = await call('POST', '/api/client/membership/pause', { membershipId, reason: 'travel' });
    check(res.status === 200 && res.body.data.status === 'paused' && res.body.data.pauseHistory?.length === 1, 'pause', res.body);
    res = await call('GET', '/api/client/stats');
    check(res.body.data?.pausedMembers === 2, 'pause syncs dependents', res.body);
    res = await call('POST', '/api/client/membership/pause', { membershipId });
    check(res.status === 400, 'cannot pause twice');
    res = await call('POST', '/api/client/membership/resume', { membershipId });
    check(res.status === 200 && res.body.data.status === 'active' && res.body.data.totalPausedDays === 0, 'resume', res.body);
    check(res.body.data?.pauseHistory?.[0]?.endedAt, 'resume closes the pause', res.body.data?.pauseHistory);

    console.log('amend and renew');
    res = await call('PATCH', '/api/client/membership/amend', { clientId: primary._id, membershipId, totalAmount: 2500, reason: 'price change' });
    check(res.status === 200 && res.body.data.client.balance === 500 && res.body.data.membership.totalAmount === 2500, 'amend raises balance', res.body);
    res = await call('PATCH', '/api/client/membership/amend', { clientId: primary._id, membershipId, totalAmount: 2500 });
    check(res.status === 400, 'amend needs a reason');

    const activeEnd = (await call('GET', `/api/client/clientInfo?id=${primary._id}`)).body.data.activeMembership.endDate;
    res = await call('PATCH', '/api/client/renew', {
        id: primary._id, planId: monthly._id, startDate: istDate(1, activeEnd), amount: 1200, method: 'cash', paymentReceived: true,
    });
    check(res.status === 200 && typeof res.body.data.upcomingMembership === 'string', 'advance renewal sets upcoming', res.body);

    res = await call('PATCH', '/api/client/update', { id: primary._id, name: 'Asha K', age: '31' });
    check(res.status === 200 && res.body.data.name === 'Asha K' && res.body.data.age === 31, 'update client', res.body);

    res = await call('GET', `/api/client/activity?id=${primary._id}`);
    const types = (res.body.data ?? []).map((a: any) => a.activityType);
    for (const t of ['ONBOARDING', 'PAYMENT', 'PAUSE', 'RESUME', 'MEMBERSHIP_AMENDED', 'ADVANCE_RENEWAL']) {
        check(types.includes(t), `activity timeline has ${t}`, types);
    }

    console.log('dashboard');
    res = await call('GET', '/api/dashboard/summary');
    check(res.status === 200 && res.body.data, 'dashboard summary', res.body);
    res = await call('GET', `/api/dashboard/revenue?from=${istDate(-30)}&to=${istDate(0)}`);
    check(res.status === 200, 'dashboard revenue', res.body);
    res = await call('GET', '/api/dashboard/activities?page=1&limit=5');
    check(res.status === 200, 'dashboard activities', res.body);

    console.log('settings, push, whatsapp');
    res = await call('POST', '/api/settings/receipt', { receipt: { footerNote: 'See you soon', showGymAddress: false } });
    check(res.status === 200, 'receipt settings', res.body);
    res = await call('POST', '/api/settings', { whatsapp: { active: false, sendOnExpiry: false, accessToken: 'tok', phoneNumberId: '123' } });
    check(res.status === 200 && !JSON.stringify(res.body).includes('"tok"'), 'whatsapp settings saved without echoing token', res.body);
    res = await call('GET', '/api/settings');
    check(res.body.data?.whatsapp?.sendOnExpiry === false && res.body.data?.receipt?.footerNote === 'See you soon', 'settings read back', res.body);
    check(res.body.data?.hasWhatsappConfigured === true, 'whatsapp counts as configured', res.body);

    res = await call('POST', '/api/user/push-token', { expoPushToken: 'ExponentPushToken[smoke]' });
    check(res.status === 200, 'save push token', res.body);
    res = await call('PATCH', '/api/user/push-prefs', { pushNotificationsEnabled: false, pushPrefs: { dailySummary: false } });
    check(res.status === 200, 'update push prefs', res.body);
    res = await call('GET', '/api/user/push-prefs');
    check(res.status === 200 && res.body.data?.pushNotificationsEnabled === false, 'read push prefs', res.body);

    res = await call('GET', '/api/whatsapp/summary');
    check(res.status === 200, 'whatsapp summary', res.body);
    res = await call('GET', '/api/whatsapp/logs?page=1&limit=10');
    check(res.status === 200, 'whatsapp logs', res.body);

    console.log('cron jobs');
    res = await call('POST', '/api/system/run-expiry-check', { secret: 'wrong' }, '');
    check(res.status === 401 || res.status === 403, 'expiry check needs secret', res.body);
    res = await call('POST', '/api/system/run-expiry-check', { secret: 'smoke_cron' }, '');
    check(res.status === 200, 'expiry check', res.body);
    res = await call('POST', '/api/system/run-push-summary', { secret: 'smoke_cron' }, '');
    check(res.status === 200, 'push summary', res.body);

    console.log('demo data');
    res = await call('POST', '/api/gym/seed-demo-data', { action: 'seed' });
    check(res.status === 200, 'seed demo data', res.body);
    const seededCount = (await call('GET', '/api/client/all')).body.data.length;
    check(seededCount > 2, 'demo members added', seededCount);
    res = await call('POST', '/api/gym/seed-demo-data', { action: 'clear' });
    check(res.status === 200, 'clear demo data', res.body);
    check((await call('GET', '/api/client/all')).body.data.length === 2, 'demo members removed');

    console.log('legacy tokens');
    const claims = jwt.decode(token) as any;
    const mongoUser = '64b000000000000000000001';
    const mongoGym = '64b000000000000000000002';
    await db.update(users).set({ legacyMongoId: mongoUser }).where(eq(users.id, claims.userId));
    await db.update(branches).set({ legacyMongoId: mongoGym }).where(eq(branches.id, claims.gymId));
    const sign = (userId: string, gymId: string) => jwt.sign({ userId, gymId, role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    res = await call('GET', '/api/gym/info', undefined, sign(mongoUser, mongoGym));
    check(res.status === 200 && res.body.data?._id === claims.gymId, 'old ObjectId token maps to new ids', res.body);
    res = await call('GET', '/api/gym/info', undefined, sign(mongoUser, '64b0000000000000000000ff'));
    check(res.status === 401, 'unknown ObjectId token is 401', res.body);

    console.log('deletes');
    res = await call('DELETE', `/api/membership/delete?id=${couple._id}`);
    check(res.status === 200, 'delete plan', res.body);
    res = await call('GET', `/api/client/clientInfo?id=${primary._id}`);
    check(res.status === 200 && res.body.data.activeMembership?._id, 'membership survives plan delete', res.body);
    res = await call('DELETE', `/api/client/delete?id=${primary._id}`);
    check(res.status === 200, 'delete client', res.body);
    res = await call('GET', '/api/client/all');
    const left = res.body.data ?? [];
    check(left.length === 1 && !left[0].activeMembership, 'dependent remains without the deleted membership', left);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
