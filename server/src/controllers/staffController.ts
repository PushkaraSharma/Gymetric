import bcrypt from "bcrypt";
import { and, asc, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import dayjs from "dayjs";
import { db } from "../db/client.js";
import { branches, roles, staff, staffAttendance, users } from "../db/schema.js";
import { addUtcDays, getISTMidnightToday, getNowIST, parseToISTMidnight } from "../utils/timeUtils.js";
import { normalizePhone, parseShifts, parseWeekOffs } from "../utils/roles.js";
import { legacyRoleFor } from "../utils/permissions.js";
import { can, forbid, invalidateAccess } from "../services/access.js";

type Session = { userId: string; gymId: string; role?: string };

const sessionOf = (request: FastifyRequest) => request.user as Session;

const deny = (reply: FastifyReply, status: number, message: string) =>
    reply.status(status).send({ success: false, message });

const APP_LINK = process.env.APP_DOWNLOAD_URL || "https://gymkarta.indieroots.in";
const MAX_SHIFTS = 3;
// A first punch this many minutes after shift start counts as late.
const LATE_GRACE_MIN = 10;

type StaffRow = typeof staff.$inferSelect;
type RoleInfo = { id: string; key: string | null; name: string };

const serializeStaff = (row: StaffRow, role: RoleInfo | null | undefined) => ({
    _id: row.id,
    name: row.name,
    phone: row.phone,
    role: role?.key ?? row.role,
    roleId: role?.id ?? null,
    roleName: role?.name ?? row.role,
    shifts: row.shifts,
    weekOffs: row.weekOffs,
    active: row.active,
    userId: row.userId,
});

const staffWithRoles = async (branchId: string, ids?: string[]) => {
    const rows = await db
        .select({ staff, role: { id: roles.id, key: roles.key, name: roles.name } })
        .from(staff)
        .innerJoin(users, eq(users.id, staff.userId))
        .leftJoin(roles, eq(roles.id, users.roleId))
        .where(and(eq(staff.branchId, branchId), ids ? inArray(staff.id, ids) : undefined))
        .orderBy(desc(staff.active), asc(staff.name));
    return rows;
};

const findStaff = async (branchId: string, id: string) => {
    const [row] = await db.select().from(staff).where(and(eq(staff.id, id), eq(staff.branchId, branchId))).limit(1);
    return row ?? null;
};

// Staff can be given any role of this gym except Owner.
const assignableRole = async (branchId: string, roleId: unknown) => {
    if (typeof roleId !== "string" || !roleId) return null;
    const [role] = await db.select({ id: roles.id, key: roles.key, name: roles.name }).from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.branchId, branchId))).limit(1);
    if (!role || role.key === "owner") return null;
    return role;
};

const inviteFor = (name: string, roleName: string, gymName: string, phone: string) => ({
    phone,
    message:
        `Hi ${name}, you have been added as ${roleName} at ${gymName} on GymKarta.\n\n` +
        `Download the app: ${APP_LINK}\n` +
        `Log in with this number (${phone}).`,
});

const validShifts = (value: unknown) => {
    const shifts = parseShifts(value);
    if (!shifts || shifts.length > MAX_SHIFTS) return null;
    return shifts;
};

export const listStaff = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "staff.view") && !can(request, "attendance.manage")) return forbid(reply);
    const rows = await staffWithRoles(sessionOf(request).gymId);
    return reply.send({ success: true, data: rows.map((r) => serializeStaff(r.staff, r.role)) });
};

export const getStaff = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "staff.view") && !can(request, "attendance.manage")) return forbid(reply);
    const { id } = request.params as { id: string };
    const [row] = await staffWithRoles(sessionOf(request).gymId, [id]);
    if (!row) return deny(reply, 404, "Staff member not found");
    return reply.send({ success: true, data: serializeStaff(row.staff, row.role) });
};

export const createStaff = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "staff.manage")) return forbid(reply);
    const { gymId } = sessionOf(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");
    const shifts = validShifts(body.shifts);
    const weekOffs = parseWeekOffs(body.weekOffs);

    if (!name) return deny(reply, 400, "Enter a name");
    if (!/^\+\d{10,15}$/.test(phone)) return deny(reply, 400, "Enter a valid phone number");
    if (password && password.length < 6) return deny(reply, 400, "Password must be at least 6 characters");
    const role = await assignableRole(gymId, body.roleId);
    if (!role) return deny(reply, 400, "Choose a role");
    if (!shifts || !weekOffs) return deny(reply, 400, "Check the shift times and week offs");

    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, phone)).limit(1);
    if (taken) return deny(reply, 409, "This phone number already has a login");

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const created = await db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({
            branchId: gymId,
            phoneNumber: phone,
            name,
            passwordHash,
            role: legacyRoleFor(role.key),
            roleId: role.id,
            isActive: true,
        }).returning();
        const [row] = await tx.insert(staff).values({
            branchId: gymId,
            userId: user.id,
            name,
            phone,
            role: legacyRoleFor(role.key),
            shifts,
            weekOffs,
        }).returning();
        return row;
    });

    const [gym] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, gymId)).limit(1);
    return reply.status(201).send({
        success: true,
        data: { ...serializeStaff(created, role), invite: inviteFor(name, role.name, gym?.name ?? "your gym", phone) },
    });
};

export const updateStaff = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "staff.manage")) return forbid(reply);
    const { gymId } = sessionOf(request);
    const { id } = request.params as { id: string };
    const existing = await findStaff(gymId, id);
    if (!existing) return deny(reply, 404, "Staff member not found");

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = body.name === undefined ? existing.name : String(body.name).trim();
    const phone = body.phone === undefined ? existing.phone : normalizePhone(String(body.phone));
    const active = body.active === undefined ? existing.active : Boolean(body.active);
    const shifts = body.shifts === undefined ? existing.shifts : validShifts(body.shifts);
    const weekOffs = body.weekOffs === undefined ? existing.weekOffs : parseWeekOffs(body.weekOffs);
    const password = body.password === undefined || body.password === "" ? null : String(body.password);

    if (!name) return deny(reply, 400, "Enter a name");
    if (!/^\+\d{10,15}$/.test(phone)) return deny(reply, 400, "Enter a valid phone number");
    if (!shifts || !weekOffs) return deny(reply, 400, "Check the shift times and week offs");
    if (password && password.length < 6) return deny(reply, 400, "Password must be at least 6 characters");
    const role = body.roleId === undefined ? undefined : await assignableRole(gymId, body.roleId);
    if (role === null) return deny(reply, 400, "Choose a role");

    if (phone !== existing.phone) {
        const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, phone)).limit(1);
        if (taken) return deny(reply, 409, "This phone number already has a login");
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    await db.transaction(async (tx) => {
        await tx.update(users).set({
            phoneNumber: phone,
            name,
            isActive: active,
            ...(role ? { roleId: role.id, role: legacyRoleFor(role.key) } : {}),
            ...(passwordHash ? { passwordHash } : {}),
            updatedAt: new Date(),
        }).where(eq(users.id, existing.userId));
        await tx.update(staff).set({
            name, phone, active, shifts, weekOffs,
            ...(role ? { role: legacyRoleFor(role.key) } : {}),
            updatedAt: new Date(),
        }).where(eq(staff.id, existing.id));
    });
    invalidateAccess(existing.userId);

    const [row] = await staffWithRoles(gymId, [existing.id]);
    return reply.send({ success: true, data: serializeStaff(row.staff, row.role) });
};

export const inviteStaff = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "staff.manage")) return forbid(reply);
    const { gymId } = sessionOf(request);
    const { id } = request.params as { id: string };
    const [row] = await staffWithRoles(gymId, [id]);
    if (!row) return deny(reply, 404, "Staff member not found");
    const [gym] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, gymId)).limit(1);
    return reply.send({
        success: true,
        data: inviteFor(row.staff.name, row.role?.name ?? row.staff.role, gym?.name ?? "your gym", row.staff.phone),
    });
};

const dayRange = (date: unknown) => {
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const from = parseToISTMidnight(date);
        return { from, to: addUtcDays(from, 1) };
    }
    const from = getISTMidnightToday();
    return { from, to: addUtcDays(from, 1) };
};

const serializePunch = (row: typeof staffAttendance.$inferSelect) => ({
    _id: row.id,
    punchedAt: row.punchedAt,
    source: row.source,
    note: row.note,
    voidedAt: row.voidedAt,
});

const pairSessions = (rows: (typeof staffAttendance.$inferSelect)[]) => {
    const open = rows.filter((row) => !row.voidedAt);
    const sessions = [];
    for (let i = 0; i < open.length; i += 2) {
        sessions.push({ in: serializePunch(open[i]), out: open[i + 1] ? serializePunch(open[i + 1]) : null });
    }
    return sessions;
};

const minutesOf = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

// Day status for one staff member: off (week off), absent, in (odd punches), out, plus late flag.
const dayStatus = (row: StaffRow, day: dayjs.Dayjs, punches: (typeof staffAttendance.$inferSelect)[]) => {
    const valid = punches.filter((p) => !p.voidedAt);
    const isOff = row.weekOffs.includes(day.day());
    const first = valid[0] ? getNowIST(valid[0].punchedAt) : null;
    const shiftStart = row.shifts[0]?.start;
    const late = !!(first && shiftStart && first.hour() * 60 + first.minute() > minutesOf(shiftStart) + LATE_GRACE_MIN);
    const status = valid.length === 0 ? (isOff ? "off" : "absent") : valid.length % 2 === 1 ? "in" : "out";
    return { status, late, firstIn: valid[0]?.punchedAt ?? null, lastPunch: valid[valid.length - 1]?.punchedAt ?? null, punches: valid.length };
};

export const listAttendance = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "staff.view") && !can(request, "attendance.manage")) return forbid(reply);
    const { gymId } = sessionOf(request);
    const { id } = request.params as { id: string };
    const existing = await findStaff(gymId, id);
    if (!existing) return deny(reply, 404, "Staff member not found");

    const query = request.query as { date?: string; month?: string };
    if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
        const start = getNowIST(parseToISTMidnight(`${query.month}-01`)).startOf("month");
        const end = start.add(1, "month");
        const rows = await db.select().from(staffAttendance).where(and(
            eq(staffAttendance.staffId, existing.id),
            gte(staffAttendance.punchedAt, start.toDate()),
            lt(staffAttendance.punchedAt, end.toDate()),
            isNull(staffAttendance.voidedAt),
        )).orderBy(asc(staffAttendance.punchedAt));
        const today = getNowIST().startOf("day");
        const joined = getNowIST(existing.createdAt).startOf("day");
        const days = [];
        for (let d = start; d.isBefore(end) && !d.isAfter(today); d = d.add(1, "day")) {
            if (d.isBefore(joined)) continue;
            const next = d.add(1, "day");
            const punches = rows.filter((r) => !getNowIST(r.punchedAt).isBefore(d) && getNowIST(r.punchedAt).isBefore(next));
            days.push({ date: d.format("YYYY-MM-DD"), ...dayStatus(existing, d, punches) });
        }
        const summary = {
            present: days.filter((d) => d.punches > 0).length,
            late: days.filter((d) => d.late).length,
            absent: days.filter((d) => d.status === "absent").length,
            off: days.filter((d) => d.status === "off").length,
        };
        return reply.send({ success: true, data: { days, summary } });
    }

    const { from, to } = dayRange(query.date);
    const rows = await db.select().from(staffAttendance).where(and(
        eq(staffAttendance.staffId, existing.id),
        gte(staffAttendance.punchedAt, from),
        lt(staffAttendance.punchedAt, to),
    )).orderBy(asc(staffAttendance.punchedAt));

    return reply.send({ success: true, data: { punches: rows.map(serializePunch), sessions: pairSessions(rows) } });
};

export const attendanceBoard = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "staff.view") && !can(request, "attendance.manage")) return forbid(reply);
    const { gymId } = sessionOf(request);
    const { from, to } = dayRange((request.query as { date?: string }).date);
    const people = (await staffWithRoles(gymId)).filter((r) => r.staff.active);
    const punches = people.length
        ? await db.select().from(staffAttendance).where(and(
            eq(staffAttendance.branchId, gymId),
            gte(staffAttendance.punchedAt, from),
            lt(staffAttendance.punchedAt, to),
        )).orderBy(asc(staffAttendance.punchedAt))
        : [];
    const day = getNowIST(from);
    const data = people.map((r) => {
        const own = punches.filter((p) => p.staffId === r.staff.id);
        return {
            staff: serializeStaff(r.staff, r.role),
            ...dayStatus(r.staff, day, own),
            sessions: pairSessions(own),
        };
    });
    const counts = {
        in: data.filter((d) => d.status === "in").length,
        out: data.filter((d) => d.status === "out").length,
        absent: data.filter((d) => d.status === "absent").length,
        off: data.filter((d) => d.status === "off").length,
        late: data.filter((d) => d.late).length,
    };
    return reply.send({ success: true, data: { date: day.format("YYYY-MM-DD"), counts, staff: data } });
};

export const addPunch = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "attendance.manage")) return forbid(reply);
    const { gymId, userId } = sessionOf(request);
    const { id } = request.params as { id: string };
    const existing = await findStaff(gymId, id);
    if (!existing) return deny(reply, 404, "Staff member not found");

    const body = (request.body ?? {}) as { punchedAt?: string; note?: string };
    const punchedAt = body.punchedAt ? new Date(body.punchedAt) : new Date();
    if (Number.isNaN(punchedAt.getTime())) return deny(reply, 400, "Enter a valid time");

    const [row] = await db.insert(staffAttendance).values({
        branchId: gymId,
        staffId: existing.id,
        punchedAt,
        source: "manual",
        note: body.note?.trim() || null,
        createdByUserId: userId,
    }).returning();

    return reply.status(201).send({ success: true, data: serializePunch(row) });
};

export const voidPunch = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!can(request, "attendance.manage")) return forbid(reply);
    const { gymId, userId } = sessionOf(request);
    const { punchId } = request.params as { punchId: string };
    const [row] = await db.select().from(staffAttendance).where(and(
        eq(staffAttendance.id, punchId),
        eq(staffAttendance.branchId, gymId),
    )).limit(1);
    if (!row) return deny(reply, 404, "Punch not found");
    if (row.voidedAt) return deny(reply, 400, "This punch is already voided");

    const [updated] = await db.update(staffAttendance).set({
        voidedAt: new Date(),
        voidedByUserId: userId,
    }).where(eq(staffAttendance.id, row.id)).returning();

    return reply.send({ success: true, data: serializePunch(updated) });
};
