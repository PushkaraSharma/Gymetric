import type { FastifyReply, FastifyRequest } from "fastify";
import { and, asc, desc, eq, gte, isNull, lt, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { attendance, memberships, membershipPauses, members, payments, staff, staffAttendance, users } from "../db/schema.js";
import { requirePermission } from "../services/access.js";

type Column = { key: string; label: string; type?: "text" | "money" | "date" | "datetime" | "number" };
type Report = { title: string; columns: Column[]; rows: Record<string, unknown>[]; summary: { label: string; value: string | number; money?: boolean }[] };

const IST_OFFSET_MS = 330 * 60 * 1000;
const istDay = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const istMinutes = (date: Date) => {
    const shifted = new Date(date.getTime() + IST_OFFSET_MS);
    return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
};
const LATE_GRACE_MIN = 10;
const MAX_DAYS = 366;

const range = (query: { from?: string; to?: string }) => {
    const valid = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const today = istDay(new Date());
    const fromDay = valid(query.from) ? query.from! : `${today.slice(0, 7)}-01`;
    const toDay = valid(query.to) ? query.to! : today;
    const from = new Date(`${fromDay}T00:00:00.000+05:30`);
    const to = new Date(new Date(`${toDay}T00:00:00.000+05:30`).getTime() + 24 * 60 * 60 * 1000);
    if (to <= from) return null;
    if ((to.getTime() - from.getTime()) / 86_400_000 > MAX_DAYS) return null;
    return { from, to, fromDay, toDay };
};

const sum = (values: (number | null | undefined)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);

async function daybook(gymId: string, from: Date, to: Date): Promise<Report> {
    const rows = await db.select({
        paidAt: payments.paidAt,
        name: members.name,
        phone: members.phoneNumber,
        amount: payments.amount,
        method: payments.method,
        type: payments.type,
        remarks: payments.remarks,
        collectedBy: users.name,
        collectorPhone: users.phoneNumber,
    }).from(payments)
        .innerJoin(members, eq(members.id, payments.memberId))
        .leftJoin(users, eq(users.id, payments.collectedByUserId))
        .where(and(eq(payments.branchId, gymId), gte(payments.paidAt, from), lt(payments.paidAt, to)))
        .orderBy(desc(payments.paidAt));
    const byMethod = new Map<string, number>();
    for (const row of rows) byMethod.set(row.method || "Other", (byMethod.get(row.method || "Other") ?? 0) + (row.amount ?? 0));
    return {
        title: "Day book",
        columns: [
            { key: "paidAt", label: "Date", type: "datetime" },
            { key: "name", label: "Client" },
            { key: "type", label: "For" },
            { key: "method", label: "Method" },
            { key: "collectedBy", label: "Collected by" },
            { key: "amount", label: "Amount", type: "money" },
        ],
        rows: rows.map((r) => ({
            paidAt: r.paidAt,
            name: r.name,
            phone: r.phone,
            type: r.type === "balance_collection" ? "Balance" : r.remarks?.startsWith("Upgrade") ? "Upgrade" : "Membership",
            method: r.method || "Other",
            collectedBy: r.collectedBy || r.collectorPhone || "",
            amount: r.amount ?? 0,
        })),
        summary: [
            { label: "Total collected", value: sum(rows.map((r) => r.amount)), money: true },
            { label: "Payments", value: rows.length },
            ...[...byMethod.entries()].map(([method, value]) => ({ label: method, value, money: true })),
        ],
    };
}

async function joinersExpiries(gymId: string, from: Date, to: Date): Promise<Report> {
    const [joined, expired] = await Promise.all([
        db.select({ at: members.createdAt, name: members.name, phone: members.phoneNumber }).from(members)
            .where(and(eq(members.branchId, gymId), gte(members.createdAt, from), lt(members.createdAt, to)))
            .orderBy(asc(members.createdAt)),
        db.select({ at: memberships.endDate, name: members.name, phone: members.phoneNumber, plan: memberships.planName, status: memberships.status })
            .from(memberships)
            .innerJoin(members, eq(members.id, memberships.primaryMemberId))
            .where(and(eq(memberships.branchId, gymId), ne(memberships.status, "upgraded"), gte(memberships.endDate, from), lt(memberships.endDate, to)))
            .orderBy(asc(memberships.endDate)),
    ]);
    const rows = [
        ...joined.map((r) => ({ at: r.at, event: "Joined", name: r.name, phone: r.phone, plan: "" })),
        ...expired.map((r) => ({ at: r.at, event: r.status === "expired" || r.status === "trial_expired" ? "Expired" : "Expires", name: r.name, phone: r.phone, plan: r.plan ?? "" })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());
    return {
        title: "Joiners and expiries",
        columns: [
            { key: "at", label: "Date", type: "date" },
            { key: "event", label: "Event" },
            { key: "name", label: "Client" },
            { key: "phone", label: "Phone" },
            { key: "plan", label: "Plan" },
        ],
        rows,
        summary: [
            { label: "Joined", value: joined.length },
            { label: "Memberships ending", value: expired.length },
        ],
    };
}

async function freezes(gymId: string, from: Date, to: Date): Promise<Report> {
    const rows = await db.select({
        startedAt: membershipPauses.startedAt,
        endedAt: membershipPauses.endedAt,
        days: membershipPauses.days,
        reason: membershipPauses.reason,
        name: members.name,
        plan: memberships.planName,
    }).from(membershipPauses)
        .innerJoin(memberships, eq(memberships.id, membershipPauses.membershipId))
        .innerJoin(members, eq(members.id, memberships.primaryMemberId))
        .where(and(eq(memberships.branchId, gymId), gte(membershipPauses.startedAt, from), lt(membershipPauses.startedAt, to)))
        .orderBy(desc(membershipPauses.startedAt));
    const now = Date.now();
    return {
        title: "Freezes",
        columns: [
            { key: "name", label: "Client" },
            { key: "plan", label: "Plan" },
            { key: "startedAt", label: "From", type: "date" },
            { key: "endedAt", label: "To", type: "date" },
            { key: "days", label: "Days", type: "number" },
            { key: "reason", label: "Reason" },
        ],
        rows: rows.map((r) => ({
            ...r,
            reason: r.reason ?? "",
            days: r.days ?? Math.max(0, Math.ceil((now - r.startedAt.getTime()) / 86_400_000)),
        })),
        summary: [
            { label: "Freezes", value: rows.length },
            { label: "Still frozen", value: rows.filter((r) => !r.endedAt).length },
        ],
    };
}

async function staffReport(gymId: string, from: Date, to: Date): Promise<Report> {
    const [people, punches] = await Promise.all([
        db.select().from(staff).where(eq(staff.branchId, gymId)).orderBy(asc(staff.name)),
        db.select({ staffId: staffAttendance.staffId, punchedAt: staffAttendance.punchedAt }).from(staffAttendance)
            .where(and(eq(staffAttendance.branchId, gymId), gte(staffAttendance.punchedAt, from), lt(staffAttendance.punchedAt, to), isNull(staffAttendance.voidedAt)))
            .orderBy(asc(staffAttendance.punchedAt)),
    ]);
    const today = istDay(new Date());
    const rows = people.map((person) => {
        const own = punches.filter((p) => p.staffId === person.id);
        const byDay = new Map<string, Date[]>();
        for (const p of own) {
            const day = istDay(p.punchedAt);
            byDay.set(day, [...(byDay.get(day) ?? []), p.punchedAt]);
        }
        const shiftStart = person.shifts[0]?.start;
        const startMinutes = shiftStart ? Number(shiftStart.slice(0, 2)) * 60 + Number(shiftStart.slice(3, 5)) : null;
        let late = 0;
        let minutes = 0;
        for (const times of byDay.values()) {
            if (startMinutes !== null && istMinutes(times[0]) > startMinutes + LATE_GRACE_MIN) late += 1;
            for (let i = 0; i + 1 < times.length; i += 2) minutes += (times[i + 1].getTime() - times[i].getTime()) / 60_000;
        }
        let absent = 0;
        const joined = istDay(person.createdAt);
        for (let t = from.getTime(); t < to.getTime(); t += 86_400_000) {
            const day = istDay(new Date(t));
            if (day > today || day < joined) continue;
            const weekday = new Date(`${day}T12:00:00.000+05:30`).getUTCDay();
            if (!person.weekOffs.includes(weekday) && !byDay.has(day)) absent += 1;
        }
        return {
            name: person.name,
            present: byDay.size,
            late,
            absent,
            hours: Math.round((minutes / 60) * 10) / 10,
            status: person.active ? "Active" : "Inactive",
        };
    });
    return {
        title: "Staff attendance",
        columns: [
            { key: "name", label: "Staff" },
            { key: "present", label: "Present", type: "number" },
            { key: "late", label: "Late", type: "number" },
            { key: "absent", label: "Absent", type: "number" },
            { key: "hours", label: "Hours", type: "number" },
        ],
        rows,
        summary: [
            { label: "Staff", value: rows.length },
            { label: "Late days", value: sum(rows.map((r) => r.late)) },
            { label: "Absent days", value: sum(rows.map((r) => r.absent)) },
        ],
    };
}

async function checkins(gymId: string, from: Date, to: Date): Promise<Report> {
    const rows = await db.select({
        punchedAt: attendance.punchedAt,
        status: attendance.status,
        denyReason: attendance.denyReason,
        memberId: attendance.memberId,
        name: members.name,
    }).from(attendance)
        .leftJoin(members, eq(members.id, attendance.memberId))
        .where(and(eq(attendance.branchId, gymId), gte(attendance.punchedAt, from), lt(attendance.punchedAt, to)))
        .orderBy(desc(attendance.punchedAt))
        .limit(5000);
    const granted = rows.filter((r) => r.status === "granted");
    return {
        title: "Check-ins",
        columns: [
            { key: "punchedAt", label: "Time", type: "datetime" },
            { key: "name", label: "Client" },
            { key: "result", label: "Result" },
        ],
        rows: rows.map((r) => ({
            punchedAt: r.punchedAt,
            name: r.name ?? "Unknown finger",
            result: r.status === "granted" ? "In" : r.denyReason || "Refused",
        })),
        summary: [
            { label: "Visits", value: granted.length },
            { label: "Different clients", value: new Set(granted.map((r) => r.memberId)).size },
            { label: "Refused", value: rows.length - granted.length },
        ],
    };
}

const REPORTS: Record<string, (gymId: string, from: Date, to: Date) => Promise<Report>> = {
    daybook,
    "joiners-expiries": joinersExpiries,
    freezes,
    "staff-attendance": staffReport,
    checkins,
};

export async function reportRoutes(fastify: any) {
    fastify.addHook("onRequest", fastify.authenticate);

    fastify.get("/:kind", { preHandler: requirePermission("reports.view") }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { kind } = request.params as { kind: string };
        const build = REPORTS[kind];
        if (!build) return reply.status(404).send({ success: false, message: "Unknown report" });
        const window = range(request.query as { from?: string; to?: string });
        if (!window) return reply.status(400).send({ success: false, message: "Pick a date range of up to one year" });
        const { gymId } = request.user as { gymId: string };
        const report = await build(gymId, window.from, window.to);
        return reply.send({ success: true, data: { ...report, from: window.fromDay, to: window.toDay } });
    });
}
