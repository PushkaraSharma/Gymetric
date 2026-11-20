/**
 * Copies every gym from MongoDB into Postgres. Mongo is only read, never written.
 *
 *   MONGO_URI=... DATABASE_URL=... npm run migrate:mongo -- [--dry-run] [--gym <mongoGymId>]
 *
 * - Safe to re-run: rows are upserted on legacy_mongo_id, and imported rows whose Mongo document
 *   no longer exists are removed. Rows created in Postgres after cutover (legacy_mongo_id null) are never touched.
 * - One transaction per gym. --dry-run does all the writes and checks, then rolls back.
 * - After each gym the Postgres side is re-counted and compared with Mongo. Any mismatch exits non-zero.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { and, eq, getTableColumns, inArray, isNotNull, notInArray, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { closeDatabase, openDatabase, type Tx } from '../db/client.js';
import { danglingUuid } from '../db/legacyIds.js';
import {
    activities,
    branchSettings,
    branches,
    members,
    membershipMembers,
    membershipPauses,
    memberships,
    messageLogs,
    organizations,
    packages,
    payments,
    users,
} from '../db/schema.js';
import Gym from '../models/Gym.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Memberships from '../models/Memberships.js';
import Client from '../models/Client.js';
import AssignedMembership from '../models/AssignedMembership.js';
import Activity from '../models/Activity.js';
import MessageLog from '../models/MessageLog.js';

const ACTIVITY_RETENTION_DAYS = 180;
const CHUNK = 500;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const gymArg = args.includes('--gym') ? args[args.indexOf('--gym') + 1] : undefined;

class DryRunRollback extends Error {}

type Doc = Record<string, any>;
type Report = {
    gym: string;
    name: string;
    warnings: string[];
    mismatches: string[];
    nonInteger: Record<string, number>;
    counts: Record<string, { mongo: number; postgres: number }>;
};

const idOf = (value: unknown) => (value === undefined || value === null ? null : String(value));
const toDate = (value: unknown): Date | null => {
    if (value === undefined || value === null || value === '') return null;
    const d = value instanceof Date ? value : new Date(value as any);
    return Number.isNaN(d.getTime()) ? null : d;
};
const toNumber = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
const toInt = (value: unknown): number | null => {
    const n = toNumber(value);
    return n === null ? null : Math.round(n);
};
const objectIdTime = (id: unknown) => {
    try {
        return new mongoose.Types.ObjectId(String(id)).getTimestamp();
    } catch {
        return new Date();
    }
};
const chunks = <T>(rows: T[]) => {
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
    return out;
};

// Inserts or updates rows by legacy_mongo_id; returns legacy id -> new uuid.
async function upsertMany(tx: Tx, table: PgTable, rows: Doc[]): Promise<Map<string, string>> {
    const cols = getTableColumns(table) as Record<string, any>;
    const ids = new Map<string, string>();
    for (const slice of chunks(rows)) {
        const keys = Object.keys(slice[0]).filter((k) => k !== 'legacyMongoId');
        const set = Object.fromEntries(keys.map((k) => [k, sql.raw(`excluded."${cols[k].name}"`)]));
        const out = await tx.insert(table).values(slice as any)
            .onConflictDoUpdate({ target: cols.legacyMongoId, set })
            .returning({ id: cols.id, legacy: cols.legacyMongoId }) as { id: string; legacy: string }[];
        for (const r of out) ids.set(r.legacy, r.id);
    }
    return ids;
}

// Removes imported rows of this branch whose Mongo document is gone.
async function prune(tx: Tx, table: PgTable & { branchId: any; legacyMongoId: any }, branchId: string, keep: string[]) {
    const where: SQL[] = [eq(table.branchId, branchId), isNotNull(table.legacyMongoId)];
    if (keep.length) where.push(notInArray(table.legacyMongoId, keep));
    await tx.delete(table).where(and(...where));
}

const countBy = (values: (string | null | undefined)[]) => {
    const out: Record<string, number> = {};
    for (const v of values) {
        const key = v ?? '(none)';
        out[key] = (out[key] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (values: (number | null)[]) => round2(values.reduce<number>((acc, v) => acc + (v ?? 0), 0));

async function migrateGym(tx: Tx, gym: Doc): Promise<Report> {
    const gymOid = gym._id;
    const gymLegacy = String(gymOid);
    const report: Report = { gym: gymLegacy, name: gym.name, warnings: [], mismatches: [], nonInteger: {}, counts: {} };
    const warn = (msg: string) => report.warnings.push(msg);
    const noteNonInteger = (label: string, value: number | null) => {
        if (value !== null && !Number.isInteger(value)) report.nonInteger[label] = (report.nonInteger[label] ?? 0) + 1;
    };

    const [userDocs, settingsDoc, planDocs, clientDocs, membershipDocs, activityDocs, logDocs] = await Promise.all([
        User.collection.find({ gymId: gymOid }).toArray(),
        Settings.collection.findOne({ gymId: gymOid }),
        Memberships.collection.find({ gymId: gymOid }).toArray(),
        Client.collection.find({ gymId: gymOid }).toArray(),
        AssignedMembership.collection.find({ gymId: gymOid }).toArray(),
        Activity.collection.find({
            gymId: gymOid,
            date: { $gte: new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000) },
        }).toArray(),
        MessageLog.collection.find({ gymId: gymOid }).toArray(),
    ]);

    // Gym -> organization + branch
    const orgIds = await upsertMany(tx, organizations, [{
        legacyMongoId: gymLegacy,
        name: gym.name,
        createdAt: toDate(gym.createdAt) ?? objectIdTime(gymOid),
    }]);
    if (!gym.contactNumber) warn('gym has no contactNumber; stored as empty string');
    const branchIds = await upsertMany(tx, branches, [{
        legacyMongoId: gymLegacy,
        organizationId: orgIds.get(gymLegacy)!,
        name: gym.name,
        address: gym.address ?? null,
        ownerName: gym.ownerName ?? null,
        contactNumber: gym.contactNumber ?? '',
        email: gym.email ?? null,
        logo: gym.logo ?? null,
        createdAt: toDate(gym.createdAt) ?? objectIdTime(gymOid),
        updatedAt: toDate(gym.updatedAt) ?? toDate(gym.createdAt) ?? objectIdTime(gymOid),
    }]);
    const branchId = branchIds.get(gymLegacy)!;

    // Users
    const userIds = userDocs.length ? await upsertMany(tx, users, userDocs.map((u) => ({
        legacyMongoId: String(u._id),
        branchId,
        phoneNumber: u.phoneNumber ?? null,
        firebaseUid: u.firebaseUid ?? null,
        username: u.username ?? null,
        passwordHash: u.passwordHash ?? null,
        role: u.role ?? 'admin',
        permissions: Array.isArray(u.permissions) ? u.permissions.map(String) : [],
        isActive: u.isActive !== false,
        expoPushToken: u.expoPushToken ?? null,
        pushNotificationsEnabled: u.pushNotificationsEnabled !== false,
        pushExpiringToday: u.pushPrefs?.expiringToday !== false,
        pushExpiringSoon: u.pushPrefs?.expiringSoon !== false,
        pushOutstandingBalance: u.pushPrefs?.outstandingBalance !== false,
        pushDailySummary: u.pushPrefs?.dailySummary !== false,
        createdAt: toDate(u.createdAt) ?? objectIdTime(u._id),
        updatedAt: toDate(u.updatedAt) ?? objectIdTime(u._id),
    }))) : new Map<string, string>();
    await prune(tx, users, branchId, [...userIds.keys()]);

    // Settings
    if (settingsDoc) {
        const w = settingsDoc.whatsapp ?? {};
        const r = settingsDoc.receipt ?? {};
        await upsertMany(tx, branchSettings, [{
            legacyMongoId: String(settingsDoc._id),
            branchId,
            whatsappAccessToken: w.accessToken ?? null,
            whatsappPhoneNumberId: w.phoneNumberId ?? null,
            whatsappActive: !!w.active,
            whatsappHeaderImageUrl: w.headerImageUrl ?? null,
            whatsappHeaderImageId: w.headerImageId ?? null,
            whatsappReminderDays: toInt(w.reminderDays) ?? 1,
            whatsappSendOnOnboarding: w.sendOnOnboarding !== false,
            whatsappSendOnRenewal: w.sendOnRenewal !== false,
            whatsappSendOnExpiry: w.sendOnExpiry !== false,
            whatsappSendOnReminder: w.sendOnReminder !== false,
            receiptLogo: r.logo ?? null,
            receiptSignature: r.signature ?? null,
            receiptFooterNote: r.footerNote ?? 'Thank you for training with us!',
            receiptShowGymAddress: r.showGymAddress !== false,
            createdAt: toDate(settingsDoc.createdAt) ?? objectIdTime(settingsDoc._id),
            updatedAt: toDate(settingsDoc.updatedAt) ?? objectIdTime(settingsDoc._id),
        }]);
    } else {
        await tx.delete(branchSettings).where(and(eq(branchSettings.branchId, branchId), isNotNull(branchSettings.legacyMongoId)));
    }

    // Plans
    const planIds = planDocs.length ? await upsertMany(tx, packages, planDocs.map((p) => {
        const price = toNumber(p.price) ?? 0;
        noteNonInteger('plan price', price);
        return {
            legacyMongoId: String(p._id),
            branchId,
            planName: p.planName ?? '',
            durationInDays: toInt(p.durationInDays) ?? 0,
            durationInMonths: toInt(p.durationInMonths) ?? 0,
            price,
            isTrial: !!p.isTrial,
            planType: p.planType ?? 'indivisual',
            membersAllowed: toInt(p.membersAllowed) ?? 1,
            description: p.description ?? null,
            active: p.active !== false,
            sortIndex: toInt(p.index) ?? 0,
            createdAt: objectIdTime(p._id),
        };
    })) : new Map<string, string>();

    // Members (membership links are set after memberships exist)
    const memberIds = clientDocs.length ? await upsertMany(tx, members, clientDocs.map((c) => {
        const balance = toNumber(c.balance) ?? 0;
        noteNonInteger('member balance', balance);
        const age = toNumber(c.age);
        if (age !== null && !Number.isInteger(age)) warn(`client ${c._id}: age ${age} rounded`);
        return {
            legacyMongoId: String(c._id),
            branchId,
            name: c.name ?? '',
            phoneNumber: c.phoneNumber ?? '',
            age: age === null ? null : Math.round(age),
            birthday: toDate(c.birthday),
            anniversaryDate: toDate(c.anniversaryDate),
            onboardingPurpose: c.onboardingPurpose ?? null,
            gender: c.gender ?? null,
            profilePicture: c.profilePicture ?? null,
            balance,
            isSeeded: !!c.isSeeded,
            role: c.role ?? 'primary',
            membershipStatus: c.membershipStatus ?? null,
            activeMembershipId: null,
            upcomingMembershipId: null,
            createdAt: toDate(c.createdAt) ?? objectIdTime(c._id),
            updatedAt: toDate(c.updatedAt) ?? objectIdTime(c._id),
        };
    })) : new Map<string, string>();

    // Memberships
    const keptMemberships = membershipDocs.filter((m) => {
        if (memberIds.has(String(m.primaryMemberId))) return true;
        warn(`membership ${m._id}: primary member ${m.primaryMemberId} does not exist; skipped`);
        return false;
    });
    const membershipIds = keptMemberships.length ? await upsertMany(tx, memberships, keptMemberships.map((m) => {
        const planLegacy = idOf(m.planId);
        if (planLegacy && !planIds.has(planLegacy)) warn(`membership ${m._id}: plan ${planLegacy} was deleted; kept as a reference to the deleted plan`);
        const totalAmount = toNumber(m.totalAmount);
        if (totalAmount === null) warn(`membership ${m._id}: no totalAmount; stored as 0`);
        noteNonInteger('membership totalAmount', totalAmount);
        const startDate = toDate(m.startDate);
        const endDate = toDate(m.endDate);
        if (!startDate || !endDate) throw new Error(`membership ${m._id} has no valid start or end date`);
        return {
            legacyMongoId: String(m._id),
            branchId,
            primaryMemberId: memberIds.get(String(m.primaryMemberId))!,
            packageId: planLegacy ? planIds.get(planLegacy) ?? danglingUuid(planLegacy) : null,
            planName: m.planName ?? null,
            startDate,
            endDate,
            status: m.status ?? 'expired',
            totalAmount: totalAmount ?? 0,
            totalPausedDays: toInt(m.totalPausedDays) ?? 0,
            createdAt: toDate(m.createdAt) ?? objectIdTime(m._id),
            updatedAt: toDate(m.updatedAt) ?? objectIdTime(m._id),
        };
    })) : new Map<string, string>();

    // Membership members and pauses are rebuilt from scratch for this branch's memberships.
    const branchMemberships = tx.select({ id: memberships.id }).from(memberships).where(eq(memberships.branchId, branchId));
    await tx.delete(membershipMembers).where(inArray(membershipMembers.membershipId, branchMemberships));
    await tx.delete(membershipPauses).where(inArray(membershipPauses.membershipId, branchMemberships));

    const linkRows: Doc[] = [];
    const pauseRows: Doc[] = [];
    for (const m of keptMemberships) {
        const membershipId = membershipIds.get(String(m._id))!;
        const seen = new Set<string>();
        (m.memberIds ?? []).forEach((raw: unknown) => {
            const legacy = idOf(raw);
            const memberId = legacy ? memberIds.get(legacy) : undefined;
            if (!memberId) {
                warn(`membership ${m._id}: member ${legacy} does not exist; dropped from members`);
                return;
            }
            if (seen.has(memberId)) return;
            seen.add(memberId);
            linkRows.push({ membershipId, memberId, position: seen.size - 1 });
        });
        (m.pauseHistory ?? []).forEach((p: Doc, i: number) => {
            const startedAt = toDate(p.startedAt);
            if (!startedAt) {
                warn(`membership ${m._id}: pause ${i} has no start date; skipped`);
                return;
            }
            pauseRows.push({
                legacyMongoId: p._id ? String(p._id) : `${m._id}:pause:${i}`,
                membershipId,
                startedAt,
                endedAt: toDate(p.endedAt),
                days: toInt(p.days),
                reason: p.reason ?? null,
            });
        });
    }
    for (const slice of chunks(linkRows)) await tx.insert(membershipMembers).values(slice as any);
    for (const slice of chunks(pauseRows)) await tx.insert(membershipPauses).values(slice as any);

    // Active / upcoming membership links
    const linkUpdates: { id: string; active: string | null; upcoming: string | null }[] = [];
    for (const c of clientDocs) {
        const resolve = (field: 'activeMembership' | 'upcomingMembership') => {
            const legacy = idOf(c[field]);
            if (!legacy) return null;
            const id = membershipIds.get(legacy);
            if (!id) warn(`client ${c._id}: ${field} ${legacy} does not exist; left empty`);
            return id ?? null;
        };
        const active = resolve('activeMembership');
        const upcoming = resolve('upcomingMembership');
        if (active || upcoming) linkUpdates.push({ id: memberIds.get(String(c._id))!, active, upcoming });
    }
    for (const slice of chunks(linkUpdates)) {
        const values = sql.join(slice.map((u) => sql`(${u.id}::uuid, ${u.active}::uuid, ${u.upcoming}::uuid)`), sql`, `);
        await tx.execute(sql`
            update ${members} set active_membership_id = v.active, upcoming_membership_id = v.upcoming
            from (values ${values}) as v(id, active, upcoming)
            where ${members.id} = v.id`);
    }

    // Membership history: Postgres derives it from membership members, so report clients where Mongo's list differs.
    const derivedHistory = new Map<string, Set<string>>();
    for (const m of keptMemberships) {
        for (const raw of m.memberIds ?? []) {
            const key = String(raw);
            if (!derivedHistory.has(key)) derivedHistory.set(key, new Set());
            derivedHistory.get(key)!.add(String(m._id));
        }
    }
    let historyDiffs = 0;
    for (const c of clientDocs) {
        const mongoHistory = new Set<string>((c.membershipHistory ?? []).map(String).filter((id: string) => membershipIds.has(id)));
        const derived = derivedHistory.get(String(c._id)) ?? new Set<string>();
        if (mongoHistory.size !== derived.size || [...mongoHistory].some((id) => !derived.has(id))) historyDiffs++;
    }
    if (historyDiffs) warn(`${historyDiffs} client(s) have a stored membershipHistory that differs from the memberships they belong to; the app will now show the latter`);

    // Payments (embedded Client.paymentHistory)
    const paymentRows: Doc[] = [];
    for (const c of clientDocs) {
        // created_at orders payment history; keep it increasing so the Mongo array order survives.
        let lastCreated = 0;
        (c.paymentHistory ?? []).forEach((p: Doc, i: number) => {
            const membershipLegacy = idOf(p.membershipId);
            if (membershipLegacy && !membershipIds.has(membershipLegacy)) {
                warn(`client ${c._id}: payment ${i} points to missing membership ${membershipLegacy}; link left empty`);
            }
            const amount = toNumber(p.amount);
            noteNonInteger('payment amount', amount);
            const paidAt = toDate(p.date);
            if (!paidAt) warn(`client ${c._id}: payment ${i} has no date; used the client creation time`);
            const fallback = toDate(c.createdAt) ?? objectIdTime(c._id);
            lastCreated = Math.max((paidAt ?? fallback).getTime(), lastCreated + 1);
            paymentRows.push({
                legacyMongoId: p._id ? String(p._id) : `${c._id}:payment:${i}`,
                branchId,
                memberId: memberIds.get(String(c._id))!,
                membershipId: membershipLegacy ? membershipIds.get(membershipLegacy) ?? null : null,
                amount,
                method: p.method ?? null,
                type: p.type ?? 'membership',
                remarks: p.remarks ?? null,
                paidAt: paidAt ?? fallback,
                createdAt: new Date(lastCreated),
            });
        });
    }
    const paymentIds = paymentRows.length ? await upsertMany(tx, payments, paymentRows) : new Map<string, string>();

    // Activities (Mongo keeps 180 days via a TTL index)
    let activitiesWithoutMember = 0;
    const activityIds = activityDocs.length ? await upsertMany(tx, activities, activityDocs.map((a) => {
        const memberLegacy = idOf(a.memberId);
        if (memberLegacy && !memberIds.has(memberLegacy)) activitiesWithoutMember++;
        return {
            legacyMongoId: String(a._id),
            branchId,
            type: a.type ?? null,
            title: a.title ?? null,
            description: a.description ?? null,
            memberId: memberLegacy ? memberIds.get(memberLegacy) ?? null : null,
            amount: toNumber(a.amount),
            date: toDate(a.date) ?? objectIdTime(a._id),
            createdAt: toDate(a.createdAt) ?? objectIdTime(a._id),
            updatedAt: toDate(a.updatedAt) ?? objectIdTime(a._id),
        };
    })) : new Map<string, string>();
    if (activitiesWithoutMember) warn(`${activitiesWithoutMember} activit(ies) point to deleted members; member link left empty`);

    // Message logs
    let logsWithoutMember = 0;
    const logIds = logDocs.length ? await upsertMany(tx, messageLogs, logDocs.map((l) => {
        const memberLegacy = idOf(l.clientId);
        if (memberLegacy && !memberIds.has(memberLegacy)) logsWithoutMember++;
        return {
            legacyMongoId: String(l._id),
            branchId,
            memberId: memberLegacy ? memberIds.get(memberLegacy) ?? null : null,
            channel: l.channel ?? 'whatsapp',
            template: l.template ?? null,
            status: l.status ?? 'failed',
            summary: l.summary ?? null,
            providerMessageId: l.providerMessageId ?? null,
            errorCode: l.errorCode ?? null,
            errorMessage: l.errorMessage ?? null,
            statusUpdatedAt: toDate(l.statusUpdatedAt),
            sentAt: toDate(l.sentAt) ?? toDate(l.createdAt) ?? objectIdTime(l._id),
            createdAt: toDate(l.createdAt) ?? objectIdTime(l._id),
            updatedAt: toDate(l.updatedAt) ?? objectIdTime(l._id),
        };
    })) : new Map<string, string>();
    if (logsWithoutMember) warn(`${logsWithoutMember} message log(s) point to deleted members; member link left empty`);

    // Drop imported rows whose Mongo document is gone (children first).
    await prune(tx, messageLogs, branchId, [...logIds.keys()]);
    await prune(tx, activities, branchId, [...activityIds.keys()]);
    await prune(tx, payments, branchId, [...paymentIds.keys()]);
    await prune(tx, memberships, branchId, [...membershipIds.keys()]);
    await prune(tx, members, branchId, [...memberIds.keys()]);
    await prune(tx, packages, branchId, [...planIds.keys()]);

    // ---- Verification: re-read Postgres and compare with what Mongo holds ----
    const pgCount = async (table: PgTable & { branchId: any }) => {
        const [row] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(table).where(eq(table.branchId, branchId));
        return row.n;
    };
    const [[links], [pauses]] = await Promise.all([
        tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(membershipMembers)
            .innerJoin(memberships, eq(memberships.id, membershipMembers.membershipId)).where(eq(memberships.branchId, branchId)),
        tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(membershipPauses)
            .innerJoin(memberships, eq(memberships.id, membershipPauses.membershipId)).where(eq(memberships.branchId, branchId)),
    ]);
    const counts: Record<string, [number, number]> = {
        users: [userDocs.length, await pgCount(users)],
        settings: [settingsDoc ? 1 : 0, await pgCount(branchSettings)],
        plans: [planDocs.length, await pgCount(packages)],
        members: [clientDocs.length, await pgCount(members)],
        memberships: [keptMemberships.length, await pgCount(memberships)],
        'membership members': [linkRows.length, links.n],
        pauses: [pauseRows.length, pauses.n],
        payments: [paymentRows.length, await pgCount(payments)],
        activities: [activityDocs.length, await pgCount(activities)],
        'message logs': [logDocs.length, await pgCount(messageLogs)],
    };
    for (const [label, [mongo, postgres]] of Object.entries(counts)) {
        report.counts[label] = { mongo, postgres };
        if (mongo !== postgres) report.mismatches.push(`${label}: Mongo ${mongo}, Postgres ${postgres}`);
    }

    const [pgSums] = await tx.select({
        payments: sql<number>`(select coalesce(sum(amount), 0) from ${payments} where branch_id = ${branchId})`.mapWith(Number),
        balance: sql<number>`(select coalesce(sum(balance), 0) from ${members} where branch_id = ${branchId})`.mapWith(Number),
        sold: sql<number>`(select coalesce(sum(total_amount), 0) from ${memberships} where branch_id = ${branchId})`.mapWith(Number),
    }).from(branches).where(eq(branches.id, branchId));
    const sums: Record<string, [number, number]> = {
        'payments total': [sum(paymentRows.map((p) => p.amount)), round2(pgSums.payments)],
        'balance total': [sum(clientDocs.map((c) => toNumber(c.balance) ?? 0)), round2(pgSums.balance)],
        'memberships total': [sum(keptMemberships.map((m) => toNumber(m.totalAmount) ?? 0)), round2(pgSums.sold)],
    };
    for (const [label, [mongo, postgres]] of Object.entries(sums)) {
        report.counts[label] = { mongo, postgres };
        if (mongo !== postgres) report.mismatches.push(`${label}: Mongo ${mongo}, Postgres ${postgres}`);
    }

    const pgStatuses = async (column: any, table: PgTable & { branchId: any }) => {
        const rows = await tx.select({ status: column, n: sql<number>`count(*)`.mapWith(Number) })
            .from(table).where(eq(table.branchId, branchId)).groupBy(column);
        const out: Record<string, number> = {};
        for (const r of rows) out[(r.status as string | null) ?? '(none)'] = r.n;
        return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
    };
    const statusChecks: [string, Record<string, number>, Record<string, number>][] = [
        ['member statuses', countBy(clientDocs.map((c) => c.membershipStatus)), await pgStatuses(members.membershipStatus, members)],
        ['membership statuses', countBy(keptMemberships.map((m) => m.status)), await pgStatuses(memberships.status, memberships)],
    ];
    for (const [label, mongo, postgres] of statusChecks) {
        if (JSON.stringify(mongo) !== JSON.stringify(postgres)) {
            report.mismatches.push(`${label}: Mongo ${JSON.stringify(mongo)}, Postgres ${JSON.stringify(postgres)}`);
        }
    }

    const [linked] = await tx.select({
        active: sql<number>`count(${members.activeMembershipId})`.mapWith(Number),
        upcoming: sql<number>`count(${members.upcomingMembershipId})`.mapWith(Number),
    }).from(members).where(eq(members.branchId, branchId));
    const expectedActive = linkUpdates.filter((u) => u.active).length;
    const expectedUpcoming = linkUpdates.filter((u) => u.upcoming).length;
    report.counts['active links'] = { mongo: expectedActive, postgres: linked.active };
    report.counts['upcoming links'] = { mongo: expectedUpcoming, postgres: linked.upcoming };
    if (linked.active !== expectedActive) report.mismatches.push(`active links: expected ${expectedActive}, Postgres ${linked.active}`);
    if (linked.upcoming !== expectedUpcoming) report.mismatches.push(`upcoming links: expected ${expectedUpcoming}, Postgres ${linked.upcoming}`);

    const skipped = membershipDocs.length - keptMemberships.length;
    if (skipped) report.counts['memberships skipped'] = { mongo: skipped, postgres: 0 };

    return report;
}

function printReport(r: Report) {
    console.log(`\n=== ${r.name} (${r.gym}) ${r.mismatches.length ? 'MISMATCH' : 'ok'}`);
    for (const [label, { mongo, postgres }] of Object.entries(r.counts)) {
        const flag = mongo === postgres || label === 'memberships skipped' ? '' : '  <-- differs';
        console.log(`  ${label.padEnd(22)} mongo ${String(mongo).padStart(10)}   postgres ${String(postgres).padStart(10)}${flag}`);
    }
    if (Object.keys(r.nonInteger).length) {
        console.log('  non-integer money values (kept exactly; note for a future integer-paise column):');
        for (const [label, n] of Object.entries(r.nonInteger)) console.log(`    ${label}: ${n}`);
    }
    if (r.warnings.length) {
        console.log(`  warnings (${r.warnings.length}):`);
        for (const w of r.warnings.slice(0, 50)) console.log(`    - ${w}`);
        if (r.warnings.length > 50) console.log(`    ... ${r.warnings.length - 50} more`);
    }
    for (const m of r.mismatches) console.log(`  MISMATCH ${m}`);
}

async function reportOrphanGymIds(gymIds: Set<string>) {
    const collections = [User, Settings, Memberships, Client, AssignedMembership, Activity, MessageLog];
    for (const model of collections) {
        const ids = (await model.collection.distinct('gymId')).map(String).filter((id: string) => !gymIds.has(id));
        if (ids.length) console.log(`  ${model.collection.collectionName}: documents for missing gym(s) ${ids.join(', ')} are not migrated`);
    }
}

async function main() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    if (!process.env.DATABASE_URL) console.warn('DATABASE_URL is not set; writing to the embedded PGlite database (rehearsal only)');

    await mongoose.connect(process.env.MONGO_URI);
    const db = await openDatabase();

    const gymFilter = gymArg ? { _id: new mongoose.Types.ObjectId(gymArg) } : {};
    const gyms = await Gym.collection.find(gymFilter).sort({ _id: 1 }).toArray();
    if (gymArg && !gyms.length) throw new Error(`Gym ${gymArg} not found in Mongo`);
    console.log(`${dryRun ? '[dry run] ' : ''}Migrating ${gyms.length} gym(s)`);

    let failed = 0;
    for (const gym of gyms) {
        const started = Date.now();
        let report: Report | undefined;
        try {
            await db.transaction(async (tx) => {
                report = await migrateGym(tx, gym);
                if (report.mismatches.length) throw new Error('verification failed; rolled back');
                if (dryRun) throw new DryRunRollback();
            }).catch((error) => {
                if (!(error instanceof DryRunRollback)) throw error;
            });
            printReport(report!);
            console.log(`  ${dryRun ? 'rolled back (dry run)' : 'committed'} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
        } catch (error: any) {
            failed++;
            if (report) printReport(report);
            console.error(`\n=== ${gym.name} (${gym._id}) FAILED: ${error.message}`);
            if (error.cause) console.error(`  cause: ${error.cause.message ?? error.cause}`);
        }
    }

    if (!gymArg) {
        console.log('\nOrphaned documents:');
        await reportOrphanGymIds(new Set(gyms.map((g) => String(g._id))));
    }

    console.log(`\n${gyms.length - failed} of ${gyms.length} gym(s) ${dryRun ? 'verified' : 'migrated'}${failed ? `, ${failed} failed` : ''}`);
    if (failed) process.exitCode = 1;
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
        await closeDatabase().catch(() => {});
    });
