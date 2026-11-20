import dayjs from 'dayjs';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { activities, memberships, membershipPauses, members, packages, payments } from '../db/schema.js';
import { addMembershipMember } from '../db/queries.js';
import type { MemberRow, PackageRow } from '../db/serializers.js';
import { calculateMembershipExpiry, getISTMidnightToday } from '../utils/timeUtils.js';

const SEED_PHONE_START = 9000000001;
const SEED_PHONE_END = 9000000080;
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Transfer'] as const;
const GENDERS = ['Male', 'Female'] as const;
const FIRST_NAMES = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Ananya', 'Rohan', 'Kavya', 'Arjun', 'Meera', 'Dev', 'Isha', 'Karan', 'Nisha', 'Aditya'];
const LAST_NAMES = ['Sharma', 'Patel', 'Singh', 'Gupta', 'Kumar', 'Reddy', 'Verma', 'Joshi', 'Malhotra', 'Agarwal'];

const randomItem = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const seedPhone = (index: number) => String(SEED_PHONE_START + index);

const randomDateBetween = (start: Date, end: Date) => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return new Date(startMs + Math.random() * (endMs - startMs));
};

const addMonths = (date: Date, months: number) => dayjs(date).add(months, 'month').toDate();

interface PlanSet {
    individual1mo: PackageRow;
    individual3mo: PackageRow;
    individual12mo: PackageRow;
    trial7day: PackageRow;
    couple1mo: PackageRow;
    couple3mo: PackageRow;
    group1mo: PackageRow;
    group3mo: PackageRow;
}

async function ensurePlans(gymId: string): Promise<PlanSet> {
    const existing = await db.select().from(packages).where(eq(packages.branchId, gymId));
    const findOrCreate = async (spec: Partial<typeof packages.$inferInsert> & { planName: string; price: number }) => {
        const found = existing.find((p) => p.planName === spec.planName);
        if (found) return found;
        const [created] = await db.insert(packages).values({ ...spec, branchId: gymId, active: true }).returning();
        existing.push(created);
        return created;
    };

    const individual1mo = await findOrCreate({ planName: 'Monthly Individual', durationInMonths: 1, price: 1500, planType: 'indivisual', membersAllowed: 1 });
    const individual3mo = await findOrCreate({ planName: 'Quarterly Individual', durationInMonths: 3, price: 4000, planType: 'indivisual', membersAllowed: 1 });
    const individual12mo = await findOrCreate({ planName: 'Annual Individual', durationInMonths: 12, price: 14000, planType: 'indivisual', membersAllowed: 1 });
    const trial7day = await findOrCreate({ planName: '7-Day Trial', durationInDays: 7, durationInMonths: 0, price: 500, planType: 'indivisual', membersAllowed: 1, isTrial: true });
    const couple1mo = await findOrCreate({ planName: 'Monthly Couple', durationInMonths: 1, price: 2500, planType: 'couple', membersAllowed: 2 });
    const couple3mo = await findOrCreate({ planName: 'Quarterly Couple', durationInMonths: 3, price: 6500, planType: 'couple', membersAllowed: 2 });
    const group1mo = await findOrCreate({ planName: 'Monthly Group (5)', durationInMonths: 1, price: 5000, planType: 'group', membersAllowed: 5 });
    const group3mo = await findOrCreate({ planName: 'Quarterly Group (5)', durationInMonths: 3, price: 13000, planType: 'group', membersAllowed: 5 });

    return { individual1mo, individual3mo, individual12mo, trial7day, couple1mo, couple3mo, group1mo, group3mo };
}

async function createSeededClient(
    gymId: string,
    phoneIndex: number,
    name: string,
    createdAt: Date,
    extra: Partial<typeof members.$inferInsert> = {}
) {
    const [client] = await db.insert(members).values({
        name,
        phoneNumber: seedPhone(phoneIndex),
        branchId: gymId,
        isSeeded: true,
        gender: randomItem(GENDERS),
        age: 20 + Math.floor(Math.random() * 25),
        onboardingPurpose: 'General Fitness',
        balance: 0,
        role: 'primary',
        createdAt,
        ...extra,
    }).returning();
    return client;
}

const updateMember = async (memberId: string, update: Partial<typeof members.$inferInsert>) => {
    const [row] = await db.update(members).set({ ...update, updatedAt: new Date() }).where(eq(members.id, memberId)).returning();
    return row;
};

async function addMembershipHistory(
    gymId: string,
    primaryClient: MemberRow,
    plan: PackageRow,
    startDate: Date,
    totalAmount: number,
    amountReceived: number,
    status: string,
    dependents: MemberRow[] = [],
    activityType: string = 'ONBOARDING',
    activityTitle: string = 'New member joined'
) {
    const endDate = calculateMembershipExpiry(startDate, plan.durationInMonths, plan.durationInDays);

    const [membership] = await db.insert(memberships).values({
        branchId: gymId,
        primaryMemberId: primaryClient.id,
        packageId: plan.id,
        planName: plan.planName,
        startDate,
        endDate,
        totalAmount,
        status,
    }).returning();
    await addMembershipMember(db, membership.id, primaryClient.id);

    for (const dep of dependents) {
        await addMembershipMember(db, membership.id, dep.id);
        const depUpdate: Partial<typeof members.$inferInsert> = { role: 'dependent', membershipStatus: status };
        if (['active', 'trial', 'paused'].includes(status)) {
            depUpdate.activeMembershipId = membership.id;
        } else if (status === 'future') {
            depUpdate.upcomingMembershipId = membership.id;
        }
        await updateMember(dep.id, depUpdate);
    }

    const paymentDate = randomDateBetween(startDate, new Date(Math.min(endDate.getTime(), Date.now())));
    await db.insert(payments).values({
        branchId: gymId,
        memberId: primaryClient.id,
        membershipId: membership.id,
        amount: amountReceived,
        method: randomItem(PAYMENT_METHODS),
        paidAt: paymentDate,
        remarks: amountReceived < totalAmount ? 'Partial payment' : 'Full payment',
        type: 'membership',
    });

    const primaryUpdate: Partial<typeof members.$inferInsert> = {
        balance: Math.max(0, (primaryClient.balance || 0) + (totalAmount - amountReceived)),
        membershipStatus: status,
    };
    if (['active', 'trial', 'paused'].includes(status)) {
        primaryUpdate.activeMembershipId = membership.id;
    } else if (status === 'future') {
        primaryUpdate.upcomingMembershipId = membership.id;
    }
    Object.assign(primaryClient, await updateMember(primaryClient.id, primaryUpdate));

    await db.insert(activities).values({
        branchId: gymId,
        type: activityType,
        title: activityTitle,
        description: `${primaryClient.name} — ${plan.planName}`,
        amount: amountReceived,
        memberId: primaryClient.id,
        date: paymentDate,
    });

    return membership;
}

export async function clearSeededData(gymId: string) {
    const seededClients = await db.select({ id: members.id }).from(members)
        .where(and(eq(members.branchId, gymId), eq(members.isSeeded, true)));
    const clientIds = seededClients.map((c) => c.id);

    if (clientIds.length === 0) {
        return { cleared: 0, message: 'No seeded data found for this gym.' };
    }

    await db.transaction(async (tx) => {
        await tx.delete(activities).where(and(eq(activities.branchId, gymId), inArray(activities.memberId, clientIds)));
        await tx.delete(memberships).where(and(eq(memberships.branchId, gymId), inArray(memberships.primaryMemberId, clientIds)));
        await tx.delete(members).where(and(eq(members.branchId, gymId), eq(members.isSeeded, true)));
    });

    return { cleared: clientIds.length, message: `Cleared ${clientIds.length} seeded clients.` };
}

export async function seedDemoData(gymId: string) {
    const [{ value: existing }] = await db.select({ value: count() }).from(members)
        .where(and(eq(members.branchId, gymId), eq(members.isSeeded, true)));
    if (existing > 0) {
        return { success: false, message: `Already seeded (${existing} clients). Clear first before re-seeding.` };
    }

    const today = getISTMidnightToday();
    const sixMonthsAgo = addMonths(today, -6);
    const plans = await ensurePlans(gymId);

    let phoneIndex = 0;
    let clientsCreated = 0;
    const log: string[] = [];

    const nextName = () => `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;

    // --- Active individuals (20) ---
    const activePlans = [plans.individual1mo, plans.individual3mo, plans.individual12mo];
    for (let i = 0; i < 20; i++) {
        const plan = activePlans[i % activePlans.length];
        const monthsAgo = 1 + (i % 5);
        const startDate = addMonths(today, -monthsAgo);
        const fullPay = i % 4 !== 0;
        const total = plan.price;
        const received = fullPay ? total : Math.floor(total * (0.4 + Math.random() * 0.4));
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, startDate));
        await addMembershipHistory(gymId, client, plan, startDate, total, received, 'active');
        clientsCreated++;
    }
    log.push('20 active individual members');

    // --- Active couples (6 pairs = 12 clients) ---
    for (let i = 0; i < 6; i++) {
        const plan = i % 2 === 0 ? plans.couple1mo : plans.couple3mo;
        const startDate = addMonths(today, -(1 + (i % 4)));
        const primary = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, startDate));
        const dependent = await createSeededClient(gymId, phoneIndex++, nextName(), primary.createdAt, { role: 'dependent' });
        const total = plan.price;
        const received = i % 3 === 0 ? Math.floor(total * 0.6) : total;
        await addMembershipHistory(gymId, primary, plan, startDate, total, received, 'active', [dependent]);
        clientsCreated += 2;
    }
    log.push('6 active couple memberships (12 clients)');

    // --- Active groups (3 groups × 4 members = 12 clients) ---
    for (let i = 0; i < 3; i++) {
        const plan = i % 2 === 0 ? plans.group1mo : plans.group3mo;
        const startDate = addMonths(today, -(2 + i));
        const primary = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, startDate));
        const deps = [];
        for (let d = 0; d < 3; d++) {
            deps.push(await createSeededClient(gymId, phoneIndex++, nextName(), primary.createdAt, { role: 'dependent' }));
        }
        await addMembershipHistory(gymId, primary, plan, startDate, plan.price, plan.price, 'active', deps);
        clientsCreated += 4;
    }
    log.push('3 active group memberships (12 clients)');

    // --- Expired, no renewal (8) ---
    for (let i = 0; i < 8; i++) {
        const plan = plans.individual1mo;
        const startDate = addMonths(today, -(4 + (i % 3)));
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, startDate));
        await addMembershipHistory(gymId, client, plan, startDate, plan.price, plan.price, 'expired');
        clientsCreated++;
    }
    log.push('8 expired members');

    // --- Expired then renewed (6 with history) ---
    for (let i = 0; i < 6; i++) {
        const plan = plans.individual3mo;
        const oldStart = addMonths(today, -5);
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, oldStart));
        await addMembershipHistory(gymId, client, plan, oldStart, plan.price, plan.price, 'expired', [], 'ONBOARDING', 'New member joined');
        const renewStart = addMonths(today, -(1 + (i % 2)));
        await addMembershipHistory(gymId, client, plan, renewStart, plan.price, plan.price, 'active', [], 'RENEWAL', 'Membership Renewed');
        clientsCreated++;
    }
    log.push('6 members with renewal history');

    // --- Trial expired → paid (2) ---
    for (let i = 0; i < 2; i++) {
        const trialStart = addMonths(today, -2);
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, trialStart));
        await addMembershipHistory(gymId, client, plans.trial7day, trialStart, plans.trial7day.price, plans.trial7day.price, 'trial_expired', [], 'ONBOARDING', 'Trial started');
        const paidStart = addMonths(today, -1);
        await addMembershipHistory(gymId, client, plans.individual1mo, paidStart, plans.individual1mo.price, plans.individual1mo.price, 'active', [], 'RENEWAL', 'Converted from trial');
        clientsCreated++;
    }
    log.push('2 trial-to-paid conversions');

    // --- Future/upcoming (3) ---
    for (let i = 0; i < 3; i++) {
        const plan = plans.individual1mo;
        const futureStart = dayjs(today).add(5 + i * 3, 'day').toDate();
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(addMonths(today, -2), today));
        const currentStart = addMonths(today, -1);
        await addMembershipHistory(gymId, client, plan, currentStart, plan.price, plan.price, 'active', [], 'ONBOARDING', 'New member joined');
        await addMembershipHistory(gymId, client, plan, futureStart, plan.price, plan.price, 'future', [], 'ADVANCE_RENEWAL', 'Advance renewal booked');
        clientsCreated++;
    }
    log.push('3 members with upcoming renewal');

    // --- Paused (2) ---
    for (let i = 0; i < 2; i++) {
        const plan = plans.individual1mo;
        const startDate = addMonths(today, -2);
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, startDate));
        const membership = await addMembershipHistory(gymId, client, plan, startDate, plan.price, plan.price, 'active');
        const pausedAt = dayjs(today).subtract(10, 'day').toDate();
        await db.update(memberships).set({ status: 'paused' }).where(eq(memberships.id, membership.id));
        await db.insert(membershipPauses).values({ membershipId: membership.id, startedAt: pausedAt, reason: 'Travel' });
        await updateMember(client.id, { membershipStatus: 'paused' });
        await db.insert(activities).values({
            branchId: gymId, type: 'PAUSE', title: 'Membership paused',
            description: `${client.name}'s membership paused`, memberId: client.id, date: pausedAt,
        });
        clientsCreated++;
    }
    log.push('2 paused memberships');

    // --- Outstanding balance ---
    for (let i = 0; i < 5; i++) {
        const plan = plans.individual1mo;
        const startDate = addMonths(today, -1);
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(addMonths(today, -3), startDate));
        await addMembershipHistory(gymId, client, plan, startDate, plan.price, Math.floor(plan.price * 0.3), 'active');
        clientsCreated++;
    }
    log.push('5 members with outstanding balance');

    // --- Recent balance collections (4) ---
    for (let i = 0; i < 4; i++) {
        const plan = plans.individual1mo;
        const startDate = addMonths(today, -2);
        const client = await createSeededClient(gymId, phoneIndex++, nextName(), randomDateBetween(sixMonthsAgo, startDate));
        await addMembershipHistory(gymId, client, plan, startDate, plan.price, Math.floor(plan.price * 0.5), 'active');
        const collectAmount = Math.min(client.balance, Math.floor(client.balance * 0.8));
        if (collectAmount > 0) {
            const collectDate = randomDateBetween(addMonths(today, -1), today);
            await db.insert(payments).values({
                branchId: gymId,
                memberId: client.id,
                amount: collectAmount,
                method: randomItem(PAYMENT_METHODS),
                paidAt: collectDate,
                remarks: 'Balance collection',
                type: 'balance_collection',
            });
            await updateMember(client.id, { balance: client.balance - collectAmount });
            await db.insert(activities).values({
                branchId: gymId, type: 'PAYMENT', title: 'Balance collected',
                description: `₹${collectAmount} collected from ${client.name}`, amount: collectAmount,
                memberId: client.id, date: collectDate,
            });
        }
        clientsCreated++;
    }
    log.push('4 members with recent balance collections');

    return {
        success: true,
        clientsCreated,
        message: `Seeded ${clientsCreated} clients with 6 months of history.`,
        log,
    };
}

export { SEED_PHONE_START, SEED_PHONE_END };
