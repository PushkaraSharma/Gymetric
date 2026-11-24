import { networkInterfaces } from "node:os";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import {
    attendance,
    biometricDevices,
    branches,
    deviceCommands,
    deviceEnrollments,
    fingerprintTemplates,
    members,
    membershipMembers,
    memberships,
    staff,
    staffAttendance,
} from "../db/schema.js";
import { can } from "./access.js";
import type { Permission } from "../utils/permissions.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const retryAfterMs = 2 * 60 * 1000;
const repeatWindowMs = 4 * 60 * 60 * 1000;
const onlineWindowMs = 90 * 1000;

type Session = { userId: string; gymId: string; role?: string };
type Subject = { kind: "member"; id: string } | { kind: "staff"; id: string };
type Shift = { start: string; end: string };

const sessionOf = (request: FastifyRequest) => request.user as Session;
const deny = (reply: FastifyReply, status: number, message: string) =>
    reply.status(status).send({ success: false, message });

const istDayIso = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const istClockMinutes = (date: Date) => {
    const shifted = new Date(date.getTime() + IST_OFFSET_MS);
    return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
};
const clockToMinutes = (value: string) => {
    const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
};

/** Check-in opens 60 minutes before the shift, never before midnight or the previous shift's end. */
const staffShiftWindows = (shifts: Shift[]) => {
    const ordered = shifts
        .map((shift) => ({
            begin: clockToMinutes(shift.start),
            close: clockToMinutes(shift.end),
        }))
        .filter((shift): shift is { begin: number; close: number } => shift.begin !== null && shift.close !== null && shift.close > shift.begin)
        .sort((a, b) => a.begin - b.begin);
    let previousEnd = 0;
    return ordered.map((shift) => {
        const open = Math.max(previousEnd, shift.begin - 60);
        previousEnd = shift.close;
        return { open, close: shift.close };
    });
};

const NO_ACCESS = "You don't have access to this. Ask the gym owner.";

function lanHost() {
    const addresses: string[] = [];
    for (const list of Object.values(networkInterfaces())) {
        for (const net of list ?? []) {
            if (net.family === "IPv4" && !net.internal) addresses.push(net.address);
        }
    }
    return addresses.find((address) => address.startsWith("192.168.") || address.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) ?? addresses[0] ?? "127.0.0.1";
}

function admsTarget() {
    const port = Number(process.env.PORT ?? 8080);
    const configured = process.env.PUBLIC_ORIGIN;
    if (configured) {
        const url = new URL(configured);
        return { admsHost: url.hostname, admsPort: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80 };
    }
    return { admsHost: lanHost(), admsPort: port };
}

async function activeDevice(branchId: string) {
    const [device] = await db.select().from(biometricDevices)
        .where(and(eq(biometricDevices.branchId, branchId), eq(biometricDevices.isActive, true))).limit(1);
    return device ?? null;
}

async function deviceBySerial(serial: string | undefined) {
    const sn = serial?.trim().toUpperCase();
    if (!sn) return null;
    const [device] = await db.select().from(biometricDevices)
        .where(and(eq(biometricDevices.serialNumber, sn), eq(biometricDevices.isActive, true))).limit(1);
    return device ?? null;
}

// The door opens only for a live membership with nothing left to pay.
// Paused, expired, upcoming, and members with a balance due are refused.
export async function doorBlock(memberId: string): Promise<"balance" | "membership" | null> {
    const [member] = await db.select({ balance: members.balance }).from(members).where(eq(members.id, memberId)).limit(1);
    if (!member) return "membership";
    const [row] = await db.select({ id: memberships.id })
        .from(membershipMembers)
        .innerJoin(memberships, eq(memberships.id, membershipMembers.membershipId))
        .where(and(
            eq(membershipMembers.memberId, memberId),
            inArray(memberships.status, ["active", "trial"]),
            gte(memberships.endDate, new Date()),
        ))
        .limit(1);
    if (!row) return "membership";
    if ((member.balance ?? 0) > 0) return "balance";
    return null;
}

export async function syncMembershipDoor(membershipId: string) {
    if (!membershipId) return;
    const people = await db.select({ memberId: membershipMembers.memberId }).from(membershipMembers)
        .where(eq(membershipMembers.membershipId, membershipId));
    for (const person of people) await syncMemberDoor(person.memberId);
}

export async function syncMemberDoor(memberId: string) {
    const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!member) return;
    const [branch] = await db.select({ enabled: branches.attendanceEnabled }).from(branches).where(eq(branches.id, member.branchId)).limit(1);
    if (!branch?.enabled) return;
    const device = await activeDevice(member.branchId);
    if (!device) return;
    const [enrollment] = await db.select().from(deviceEnrollments)
        .where(and(eq(deviceEnrollments.deviceId, device.id), eq(deviceEnrollments.memberId, memberId))).limit(1);
    if (!enrollment) return;
    const open = (await doorBlock(memberId)) === null;
    const fingers = await db.select().from(fingerprintTemplates).where(eq(fingerprintTemplates.enrollmentId, enrollment.id));
    if (!open) {
        const present = fingers.filter((finger) => finger.onDevice);
        for (const finger of present) {
            await enqueueLine(device.id, "HOLD_FINGER", enrollment.pin, `DATA DELETE FINGERTMP PIN=${enrollment.pin}\tFID=${finger.fid}`);
        }
        if (present.length > 0) {
            await db.update(fingerprintTemplates).set({ onDevice: false }).where(eq(fingerprintTemplates.enrollmentId, enrollment.id));
        }
        return;
    }
    const held = fingers.filter((finger) => !finger.onDevice);
    for (const finger of held) {
        await enqueueLine(device.id, "RESTORE_FINGER", enrollment.pin, `DATA UPDATE FINGERTMP PIN=${enrollment.pin}\tFID=${finger.fid}\tSize=${finger.size}\tValid=1\tTMP=${finger.template}`);
    }
    if (held.length > 0) {
        await db.update(fingerprintTemplates).set({ onDevice: true }).where(eq(fingerprintTemplates.enrollmentId, enrollment.id));
    }
    if (enrollment.fingerprintStatus === "enrolled") await enqueue(device.id, "ENABLE_USER", enrollment.pin, member.name);
}

async function deviceView(branchId: string) {
    const [branch] = await db.select({ enabled: branches.attendanceEnabled }).from(branches).where(eq(branches.id, branchId)).limit(1);
    const device = await activeDevice(branchId);
    const adms = admsTarget();
    if (!device) {
        return { enabled: Boolean(branch?.enabled), paired: false, online: false, serialNumber: null, lastHeartbeatAt: null, pendingCommands: 0, ...adms };
    }
    const pending = await db.select({ id: deviceCommands.id }).from(deviceCommands)
        .where(and(eq(deviceCommands.deviceId, device.id), eq(deviceCommands.status, "pending")));
    const seen = device.lastHeartbeatAt?.getTime() ?? 0;
    return {
        enabled: Boolean(branch?.enabled),
        paired: true,
        online: seen > Date.now() - onlineWindowMs,
        serialNumber: device.serialNumber,
        lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() ?? null,
        pendingCommands: pending.length,
        ...adms,
    };
}

function subjectWhere(deviceId: string, subject: Subject) {
    return and(
        eq(deviceEnrollments.deviceId, deviceId),
        subject.kind === "member" ? eq(deviceEnrollments.memberId, subject.id) : eq(deviceEnrollments.staffId, subject.id),
    );
}

async function ensurePin(deviceId: string, subject: Subject) {
    const [existing] = await db.select({ pin: deviceEnrollments.pin }).from(deviceEnrollments).where(subjectWhere(deviceId, subject)).limit(1);
    if (existing) return existing.pin;
    const [bumped] = await db.update(biometricDevices).set({ nextPin: sql`${biometricDevices.nextPin} + 1` })
        .where(eq(biometricDevices.id, deviceId)).returning({ nextPin: biometricDevices.nextPin });
    const pin = (bumped?.nextPin ?? 1002) - 1;
    await db.insert(deviceEnrollments).values({
        deviceId,
        memberId: subject.kind === "member" ? subject.id : null,
        staffId: subject.kind === "staff" ? subject.id : null,
        pin,
        fingerprintStatus: "pending",
    });
    return pin;
}

async function enqueueLine(deviceId: string, type: string, pin: number, line: string) {
    const [bumped] = await db.update(biometricDevices).set({ lastCommandId: sql`${biometricDevices.lastCommandId} + 1` })
        .where(eq(biometricDevices.id, deviceId)).returning({ cmdId: biometricDevices.lastCommandId });
    const cmdId = bumped?.cmdId ?? 1;
    await db.insert(deviceCommands).values({ deviceId, cmdId, type, pin, payload: `C:${cmdId}:${line}`, status: "pending" });
    return cmdId;
}

async function enqueue(deviceId: string, type: "CREATE_USER" | "ENABLE_USER" | "ENROLL_FP" | "OPEN_DOOR" | "DELETE_USER" | "CANCEL_ENROLL", pin: number, name: string) {
    const [bumped] = await db.update(biometricDevices).set({ lastCommandId: sql`${biometricDevices.lastCommandId} + 1` })
        .where(eq(biometricDevices.id, deviceId)).returning({ cmdId: biometricDevices.lastCommandId });
    const cmdId = bumped?.cmdId ?? 1;
    const payload = type === "OPEN_DOOR"
        ? `C:${cmdId}:CONTROL DEVICE 01010105`
        : type === "CANCEL_ENROLL"
            ? `C:${cmdId}:CMD_CANCEL_ENROLL`
            : type === "DELETE_USER"
                ? `C:${cmdId}:DATA DELETE USERINFO PIN=${pin}`
                : type === "ENROLL_FP"
                    ? `C:${cmdId}:ENROLL_FP PIN=${pin}\tFID=0\tRETRY=3\tOVERWRITE=1`
                    : `C:${cmdId}:DATA UPDATE USERINFO PIN=${pin}\tName=${name || pin}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000100000000\tExpires=0\tStartDatetime=0\tEndDatetime=0`;
    await db.insert(deviceCommands).values({ deviceId, cmdId, type, pin, name: name || null, payload, status: "pending" });
    return cmdId;
}

async function stopEnroll(deviceId: string, pin: number) {
    await db.delete(deviceCommands).where(and(
        eq(deviceCommands.deviceId, deviceId),
        eq(deviceCommands.type, "ENROLL_FP"),
        inArray(deviceCommands.status, ["pending", "sent"]),
    ));
    await enqueue(deviceId, "CANCEL_ENROLL", pin, "");
}

async function startEnroll(branchId: string, subject: Subject) {
    const [branch] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
    if (!branch?.attendanceEnabled) return { error: "Turn the entrance reader on in Settings." };
    const device = await activeDevice(branchId);
    if (!device) return { error: "Pair the entrance reader first." };
    let name: string;
    if (subject.kind === "member") {
        const [member] = await db.select().from(members).where(and(eq(members.id, subject.id), eq(members.branchId, branchId))).limit(1);
        if (!member) return { error: "That member is not at this gym." };
        const block = await doorBlock(member.id);
        if (block === "balance") return { error: "This client has a balance due, so the door cannot open for them." };
        if (block) return { error: "This client has no active membership, so the door cannot open for them." };
        name = member.name;
    } else {
        const [person] = await db.select().from(staff).where(and(eq(staff.id, subject.id), eq(staff.branchId, branchId), eq(staff.active, true))).limit(1);
        if (!person) return { error: "That staff member is not at this gym." };
        name = person.name;
    }
    const pin = await ensurePin(device.id, subject);
    await db.update(deviceEnrollments).set({ fingerprintStatus: "pending" }).where(subjectWhere(device.id, subject));
    await enqueue(device.id, "CREATE_USER", pin, name);
    await enqueue(device.id, "ENABLE_USER", pin, name);
    const [enrolling] = await db.select({ id: deviceCommands.id }).from(deviceCommands).where(and(
        eq(deviceCommands.deviceId, device.id),
        eq(deviceCommands.type, "ENROLL_FP"),
        eq(deviceCommands.pin, pin),
        inArray(deviceCommands.status, ["pending", "sent"]),
    )).limit(1);
    if (!enrolling) await enqueue(device.id, "ENROLL_FP", pin, name);
    return { status: "pending" as const, pin };
}

async function confirmEnroll(branchId: string, subject: Subject) {
    const device = await activeDevice(branchId);
    if (!device) return { error: "Pair the entrance reader first." };
    const [row] = await db.update(deviceEnrollments)
        .set({ fingerprintStatus: "enrolled", enrolledAt: new Date() })
        .where(subjectWhere(device.id, subject))
        .returning({ pin: deviceEnrollments.pin });
    if (!row) return { error: "Start enrollment before marking it done." };
    await stopEnroll(device.id, row.pin);
    return { status: "enrolled" as const, pin: row.pin };
}

async function cancelEnroll(branchId: string, subject: Subject) {
    const device = await activeDevice(branchId);
    if (!device) return { error: "Pair the entrance reader first." };
    const [row] = await db.select({
        pin: deviceEnrollments.pin,
        status: deviceEnrollments.fingerprintStatus,
        enrolledAt: deviceEnrollments.enrolledAt,
    }).from(deviceEnrollments).where(subjectWhere(device.id, subject)).limit(1);
    await stopEnroll(device.id, row?.pin ?? 0);
    if (!row) return { status: "none" as const, pin: null };
    const restored = row.enrolledAt != null ? "enrolled" as const : "none" as const;
    if (row.status === "pending") {
        await db.update(deviceEnrollments).set({ fingerprintStatus: restored }).where(subjectWhere(device.id, subject));
    }
    return { status: restored, pin: row.pin };
}

async function fingerprintView(branchId: string, subject: Subject) {
    const [branch] = await db.select({ enabled: branches.attendanceEnabled }).from(branches).where(eq(branches.id, branchId)).limit(1);
    const doorLock = subject.kind === "member" ? await doorBlock(subject.id) : null;
    const device = await activeDevice(branchId);
    if (!device) {
        return { readerEnabled: Boolean(branch?.enabled), fingerprint: { status: "none", pin: null, canEnroll: doorLock === null, doorLock } };
    }
    const [row] = await db.select({ status: deviceEnrollments.fingerprintStatus, pin: deviceEnrollments.pin })
        .from(deviceEnrollments).where(subjectWhere(device.id, subject)).limit(1);
    return {
        readerEnabled: Boolean(branch?.enabled),
        fingerprint: {
            status: row?.status ?? "none",
            pin: row?.pin ?? null,
            canEnroll: doorLock === null,
            doorLock,
        },
    };
}

export async function deleteMemberFromDevice(memberId: string) {
    const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!member) return;
    const device = await activeDevice(member.branchId);
    if (!device) return;
    const [enrollment] = await db.select().from(deviceEnrollments)
        .where(and(eq(deviceEnrollments.deviceId, device.id), eq(deviceEnrollments.memberId, memberId))).limit(1);
    if (!enrollment) return;
    await enqueue(device.id, "DELETE_USER", enrollment.pin, member.name);
    await db.update(fingerprintTemplates).set({ onDevice: false }).where(eq(fingerprintTemplates.enrollmentId, enrollment.id));
}

async function touch(deviceId: string) {
    await db.update(biometricDevices).set({ lastHeartbeatAt: new Date() }).where(eq(biometricDevices.id, deviceId));
}

async function readerOn(branchId: string) {
    const [branch] = await db.select({ enabled: branches.attendanceEnabled }).from(branches).where(eq(branches.id, branchId)).limit(1);
    return Boolean(branch?.enabled);
}

export async function heartbeat(query: { SN?: string; options?: string }) {
    const device = await deviceBySerial(query.SN);
    if (!device) return "OK";
    await touch(device.id);
    if (query.options !== "all") return "OK";
    return `GET OPTION FROM: ${device.serialNumber}\nATTLOGStamp=0\nOPERLOGStamp=0\nATTPHOTOStamp=0\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:00\nTransInterval=1\nTransFlag=1111000000\nTimeZone=5.5\nRealtime=1\nEncrypt=0\n`;
}

export async function pullCommands(serial: string | undefined) {
    const device = await deviceBySerial(serial);
    if (!device) return "OK";
    await touch(device.id);
    if (!(await readerOn(device.branchId))) return "OK";
    const due = new Date(Date.now() - retryAfterMs);
    const waiting = await db.select().from(deviceCommands).where(and(
        eq(deviceCommands.deviceId, device.id),
        sql`(${deviceCommands.status} = 'pending' or (${deviceCommands.status} = 'sent' and ${deviceCommands.sentAt} < ${due}))`,
    )).orderBy(asc(deviceCommands.cmdId));
    if (waiting.length === 0) return "OK";
    const cancel = waiting.filter((row) => row.type === "CANCEL_ENROLL");
    const outbound = cancel.length > 0 ? cancel : waiting;
    await db.update(deviceCommands).set({ status: "sent", sentAt: new Date() }).where(inArray(deviceCommands.id, outbound.map((row) => row.id)));
    return outbound.map((row) => row.payload).join("\n");
}

function redactTemplate(raw: string) {
    return raw.replace(/TMP=[^\s]+/g, "TMP=<held>");
}

function parseAttLog(line: string) {
    const [pinText, timeText] = line.split(/\t+/);
    const pin = Number(pinText?.trim());
    const time = timeText?.trim();
    if (!pin || !time) return null;
    const punchedAt = new Date(time.replace(" ", "T") + "+05:30");
    if (Number.isNaN(punchedAt.getTime())) return null;
    return { pin, punchedAt };
}

function parseTemplate(line: string) {
    const pin = Number(line.match(/\bPIN=(\d+)/)?.[1]);
    const fid = Number(line.match(/\bFID=(\d+)/)?.[1]);
    const size = Number(line.match(/\bSize=(\d+)/i)?.[1]);
    const template = line.match(/\bTMP=([A-Za-z0-9+/=]+)/)?.[1];
    if (!pin || !Number.isInteger(fid) || !template) return null;
    return { pin, fid, size: size || template.length, template };
}

async function saveTemplate(device: { id: string }, line: string) {
    const parsed = parseTemplate(line);
    if (!parsed) return;
    const [enrollment] = await db.select().from(deviceEnrollments)
        .where(and(eq(deviceEnrollments.deviceId, device.id), eq(deviceEnrollments.pin, parsed.pin))).limit(1);
    if (!enrollment) return;
    await db.insert(fingerprintTemplates).values({
        enrollmentId: enrollment.id, fid: parsed.fid, size: parsed.size, template: parsed.template, onDevice: true,
    }).onConflictDoUpdate({
        target: [fingerprintTemplates.enrollmentId, fingerprintTemplates.fid],
        set: { size: parsed.size, template: parsed.template, onDevice: true },
    });
    if (enrollment.memberId && (await doorBlock(enrollment.memberId))) {
        await enqueueLine(device.id, "HOLD_FINGER", parsed.pin, `DATA DELETE FINGERTMP PIN=${parsed.pin}\tFID=${parsed.fid}`);
        await db.update(fingerprintTemplates).set({ onDevice: false }).where(and(
            eq(fingerprintTemplates.enrollmentId, enrollment.id),
            eq(fingerprintTemplates.fid, parsed.fid),
        ));
    }
}

async function staffScanCounts(shifts: Shift[], weekOffs: number[], staffId: string, punchedAt: Date) {
    const day = istDayIso(punchedAt);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    const minute = istClockMinutes(punchedAt);
    const windows = weekOffs.includes(weekday) ? [] : staffShiftWindows(shifts);
    const window = windows.find((item) => minute >= item.open && minute <= item.close);
    if (windows.length > 0 && !window) return false;
    const existing = await db.select({ punchedAt: staffAttendance.punchedAt }).from(staffAttendance).where(and(
        eq(staffAttendance.staffId, staffId),
        isNull(staffAttendance.voidedAt),
        gte(staffAttendance.punchedAt, new Date(`${day}T00:00:00.000+05:30`)),
        lte(staffAttendance.punchedAt, new Date(`${day}T23:59:59.999+05:30`)),
    ));
    if (!window) return existing.length === 0;
    return !existing.some((punch) => {
        const at = istClockMinutes(punch.punchedAt);
        return at >= window.open && at <= window.close;
    });
}

async function recordPunch(device: { id: string; branchId: string }, pin: number, punchedAt: Date) {
    const [enrollment] = await db.select({
        memberId: deviceEnrollments.memberId,
        staffId: deviceEnrollments.staffId,
        status: deviceEnrollments.fingerprintStatus,
    }).from(deviceEnrollments).where(and(eq(deviceEnrollments.deviceId, device.id), eq(deviceEnrollments.pin, pin))).limit(1);

    if (enrollment?.staffId) {
        const [person] = await db.select({ shifts: staff.shifts, weekOffs: staff.weekOffs }).from(staff).where(eq(staff.id, enrollment.staffId)).limit(1);
        if (!person) return;
        if (!(await staffScanCounts(person.shifts ?? [], person.weekOffs ?? [], enrollment.staffId, punchedAt))) return;
        await db.insert(staffAttendance).values({
            branchId: device.branchId,
            staffId: enrollment.staffId,
            punchedAt,
            source: "device",
            deviceId: device.id,
            pin,
        });
        return;
    }

    const since = new Date(punchedAt.getTime() - repeatWindowMs);
    const [recent] = await db.select({ id: attendance.id }).from(attendance).where(and(
        eq(attendance.deviceId, device.id),
        eq(attendance.pin, pin),
        gt(attendance.punchedAt, since),
        lte(attendance.punchedAt, punchedAt),
    )).limit(1);
    if (recent) return;
    const block = enrollment?.memberId ? await doorBlock(enrollment.memberId) : "membership";
    const granted = Boolean(enrollment?.memberId) && block === null;
    await db.insert(attendance).values({
        branchId: device.branchId,
        memberId: enrollment?.memberId ?? null,
        deviceId: device.id,
        pin,
        status: granted ? "granted" : "denied",
        denyReason: granted ? null : !enrollment ? `Unknown PIN ${pin}` : block === "balance" ? "Balance is due." : "Membership is not active.",
        punchedAt,
    });
}

export async function acceptLog(query: { SN?: string; table?: string }, raw: string) {
    const device = await deviceBySerial(query.SN);
    if (!device) return;
    await touch(device.id);
    if (!(await readerOn(device.branchId))) return;
    const lines = raw.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    if (query.table === "ATTLOG") {
        for (const line of lines) {
            const parsed = parseAttLog(line);
            if (parsed) await recordPunch(device, parsed.pin, parsed.punchedAt);
        }
        return;
    }
    if (query.table === "OPERLOG") {
        for (const line of lines) {
            if (line.startsWith("FP ")) await saveTemplate(device, line);
            const pin = Number(line.match(/\bPIN=(\d+)/)?.[1]);
            if (!pin || (!line.startsWith("FP ") && !line.startsWith("USER "))) continue;
            await db.update(deviceEnrollments).set({ fingerprintStatus: "enrolled", enrolledAt: new Date() })
                .where(and(eq(deviceEnrollments.deviceId, device.id), eq(deviceEnrollments.pin, pin)));
            if (line.startsWith("FP ")) await stopEnroll(device.id, pin);
        }
    }
}

export async function ackCommands(serial: string | undefined, raw: string) {
    const device = await deviceBySerial(serial);
    if (!device) return;
    await touch(device.id);
    const ids = [...raw.matchAll(/ID=(\d+)/gi)].map((match) => Number(match[1]));
    if (ids.length === 0) return;
    await db.update(deviceCommands).set({ status: "acked", ackedAt: new Date() })
        .where(and(eq(deviceCommands.deviceId, device.id), inArray(deviceCommands.cmdId, ids)));
}

export function readerLogBody(raw: string) {
    return redactTemplate(raw);
}

export const getDevice = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true, data: await deviceView(sessionOf(request).gymId) });
};

export const setEnabled = async (request: FastifyRequest, reply: FastifyReply) => {
    const { gymId } = sessionOf(request);
    if (!can(request, "entrance.manage")) return deny(reply, 403, NO_ACCESS);
    const enabled = Boolean((request.body as { enabled?: boolean })?.enabled);
    await db.update(branches).set({ attendanceEnabled: enabled, updatedAt: new Date() }).where(eq(branches.id, gymId));
    return reply.send({ success: true, data: await deviceView(gymId) });
};

export const pairDevice = async (request: FastifyRequest, reply: FastifyReply) => {
    const { gymId } = sessionOf(request);
    if (!can(request, "entrance.manage")) return deny(reply, 403, NO_ACCESS);
    const serial = String((request.body as { serialNumber?: string })?.serialNumber ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,32}$/.test(serial)) return deny(reply, 400, "Enter the serial number printed on the reader.");
    const [taken] = await db.select().from(biometricDevices).where(eq(biometricDevices.serialNumber, serial)).limit(1);
    if (taken && taken.branchId !== gymId) return deny(reply, 409, "That reader is already paired to another gym.");
    await db.update(biometricDevices).set({ isActive: false }).where(eq(biometricDevices.branchId, gymId));
    if (taken) {
        await db.update(biometricDevices).set({ isActive: true, branchId: gymId }).where(eq(biometricDevices.id, taken.id));
    } else {
        await db.insert(biometricDevices).values({ branchId: gymId, serialNumber: serial, name: "Entrance", isActive: true });
    }
    return reply.send({ success: true, data: await deviceView(gymId) });
};

export const unpairDevice = async (request: FastifyRequest, reply: FastifyReply) => {
    const { gymId } = sessionOf(request);
    if (!can(request, "entrance.manage")) return deny(reply, 403, NO_ACCESS);
    await db.update(biometricDevices).set({ isActive: false }).where(eq(biometricDevices.branchId, gymId));
    return reply.send({ success: true, data: await deviceView(gymId) });
};

export const openDoor = async (request: FastifyRequest, reply: FastifyReply) => {
    const { gymId } = sessionOf(request);
    if (!can(request, "door.open")) return deny(reply, 403, NO_ACCESS);
    const [branch] = await db.select({ enabled: branches.attendanceEnabled }).from(branches).where(eq(branches.id, gymId)).limit(1);
    if (!branch?.enabled) return deny(reply, 400, "Turn the entrance reader on in Settings.");
    const device = await activeDevice(gymId);
    if (!device) return deny(reply, 400, "Pair the entrance reader first.");
    const commandId = await enqueue(device.id, "OPEN_DOOR", 0, "");
    return reply.send({ success: true, data: { commandId } });
};

export const commandStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { gymId } = sessionOf(request);
    if (!can(request, "door.open")) return deny(reply, 403, NO_ACCESS);
    const cmdId = Number((request.params as { cmdId: string }).cmdId);
    const device = await activeDevice(gymId);
    if (!device) return deny(reply, 404, "Pair the entrance reader first.");
    const [row] = await db.select({ cmdId: deviceCommands.cmdId, status: deviceCommands.status }).from(deviceCommands)
        .where(and(eq(deviceCommands.deviceId, device.id), eq(deviceCommands.cmdId, cmdId))).limit(1);
    if (!row) return deny(reply, 404, "Command not found.");
    return reply.send({ success: true, data: { commandId: row.cmdId, status: row.status } });
};

export const listCheckins = async (request: FastifyRequest, reply: FastifyReply) => {
    const { gymId } = sessionOf(request);
    if (!can(request, "clients.view")) return deny(reply, 403, NO_ACCESS);
    const date = (request.query as { date?: string }).date;
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : istDayIso(new Date());
    const from = new Date(`${day}T00:00:00.000+05:30`);
    const to = new Date(`${day}T23:59:59.999+05:30`);
    const rows = await db.select({
        id: attendance.id,
        punchedAt: attendance.punchedAt,
        status: attendance.status,
        denyReason: attendance.denyReason,
        memberId: attendance.memberId,
        name: members.name,
    }).from(attendance)
        .leftJoin(members, eq(members.id, attendance.memberId))
        .where(and(eq(attendance.branchId, gymId), gte(attendance.punchedAt, from), lte(attendance.punchedAt, to)))
        .orderBy(desc(attendance.punchedAt))
        .limit(100);
    return reply.send({
        success: true,
        data: rows.map((row) => ({
            _id: row.id,
            memberId: row.memberId,
            name: row.name,
            punchedAt: row.punchedAt,
            status: row.status,
            denyReason: row.denyReason,
        })),
    });
};

// One month of door visits for a client: granted punches grouped by IST day, plus refusals.
export const memberVisits = async (request: FastifyRequest, reply: FastifyReply) => {
    const { gymId } = sessionOf(request);
    if (!can(request, "clients.view")) return deny(reply, 403, NO_ACCESS);
    const id = String((request.params as { id?: string }).id ?? "");
    const [member] = await db.select({ id: members.id }).from(members)
        .where(and(eq(members.id, id), eq(members.branchId, String(gymId)))).limit(1);
    if (!member) return deny(reply, 404, "Client not found");

    const query = (request.query as { month?: string }).month;
    const month = query && /^\d{4}-\d{2}$/.test(query) ? query : istDayIso(new Date()).slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(`${month}-01T00:00:00.000+05:30`);
    const next = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
    const to = new Date(`${next}-01T00:00:00.000+05:30`);

    const [rows, [last]] = await Promise.all([
        db.select({ punchedAt: attendance.punchedAt, status: attendance.status, denyReason: attendance.denyReason })
            .from(attendance)
            .where(and(eq(attendance.memberId, id), gte(attendance.punchedAt, from), lt(attendance.punchedAt, to)))
            .orderBy(asc(attendance.punchedAt)),
        db.select({ punchedAt: attendance.punchedAt }).from(attendance)
            .where(and(eq(attendance.memberId, id), eq(attendance.status, "granted")))
            .orderBy(desc(attendance.punchedAt)).limit(1),
    ]);

    const days = new Map<string, { date: string; firstIn: Date; punches: number }>();
    for (const row of rows) {
        if (row.status !== "granted") continue;
        const day = istDayIso(row.punchedAt);
        const entry = days.get(day);
        if (entry) entry.punches += 1;
        else days.set(day, { date: day, firstIn: row.punchedAt, punches: 1 });
    }
    return reply.send({
        success: true,
        data: {
            month,
            visits: days.size,
            lastVisitAt: last?.punchedAt ?? null,
            days: [...days.values()],
            refused: rows.filter((r) => r.status !== "granted").map((r) => ({ punchedAt: r.punchedAt, reason: r.denyReason })),
        },
    });
};

const enrollHandlers = (kind: "member" | "staff") => {
    const subject = (request: FastifyRequest): { gymId: string; id: string } => ({
        gymId: String(sessionOf(request).gymId),
        id: String((request.params as { id?: string }).id ?? ""),
    });
    const viewPermission: Permission = kind === "member" ? "clients.view" : "staff.view";
    const editPermission: Permission = kind === "member" ? "clients.edit" : "staff.manage";
    return {
    view: async (request: FastifyRequest, reply: FastifyReply) => {
        if (!can(request, viewPermission)) return deny(reply, 403, NO_ACCESS);
        const { gymId, id } = subject(request);
        return reply.send({ success: true, data: await fingerprintView(gymId, { kind, id }) });
    },
    start: async (request: FastifyRequest, reply: FastifyReply) => {
        if (!can(request, editPermission)) return deny(reply, 403, NO_ACCESS);
        const { gymId, id } = subject(request);
        const started = await startEnroll(gymId, { kind, id });
        if (started.error) return deny(reply, 400, started.error);
        return reply.send({ success: true, data: started });
    },
    confirm: async (request: FastifyRequest, reply: FastifyReply) => {
        if (!can(request, editPermission)) return deny(reply, 403, NO_ACCESS);
        const { gymId, id } = subject(request);
        const confirmed = await confirmEnroll(gymId, { kind, id });
        if (confirmed.error) return deny(reply, 400, confirmed.error);
        return reply.send({ success: true, data: confirmed });
    },
    cancel: async (request: FastifyRequest, reply: FastifyReply) => {
        if (!can(request, editPermission)) return deny(reply, 403, NO_ACCESS);
        const { gymId, id } = subject(request);
        const cancelled = await cancelEnroll(gymId, { kind, id });
        if (cancelled.error) return deny(reply, 400, cancelled.error);
        return reply.send({ success: true, data: cancelled });
    },
    };
};

export const memberFinger = enrollHandlers("member");
export const staffFinger = enrollHandlers("staff");
