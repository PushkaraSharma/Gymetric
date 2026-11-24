import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, count, desc, eq, gte, inArray, isNull, like, lt, ne, or, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { members, memberships, messageLogs, users } from "../db/schema.js";
import { findBranch, findMember, findSettings } from "../db/queries.js";
import { whatsappConfig } from "../db/serializers.js";
import { requireFeature, requirePermission } from "../services/access.js";
import { sendWhatsAppTemplate, sendWhatsAppText, toWhatsAppNumber } from "../services/Whatsapp.js";
import { formatShortDate, getISTMidnightToday } from "../utils/timeUtils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const last10 = (phone?: string | null) => (phone ?? "").replace(/\D/g, "").slice(-10);
const user = (request: FastifyRequest) => request.user as { gymId: string; userId: string };

type Target = { memberId: string | null; phone: string };

// A thread is every message with the client's id, plus messages from their number that arrived before we matched them.
const threadWhere = (gymId: string, target: Target): SQL => {
    const byPhone = like(messageLogs.phone, `%${target.phone}`);
    const scope = target.memberId
        ? or(eq(messageLogs.memberId, target.memberId), and(isNull(messageLogs.memberId), byPhone))!
        : and(isNull(messageLogs.memberId), byPhone)!;
    return and(eq(messageLogs.branchId, gymId), scope)!;
};

const resolveTarget = async (gymId: string, input: { memberId?: string; phone?: string }) => {
    if (input.memberId) {
        const member = await findMember(db, input.memberId, gymId);
        if (!member) return null;
        return { target: { memberId: member.id, phone: last10(member.phoneNumber) }, member };
    }
    const phone = last10(input.phone);
    if (phone.length !== 10) return null;
    const [member] = await db.select().from(members).where(and(eq(members.branchId, gymId), eq(members.phoneNumber, phone))).limit(1);
    return { target: { memberId: member?.id ?? null, phone }, member: member ?? null };
};

const lastInboundAt = async (gymId: string, target: Target) => {
    const [row] = await db.select({ at: messageLogs.sentAt }).from(messageLogs)
        .where(and(threadWhere(gymId, target), eq(messageLogs.direction, "in")))
        .orderBy(desc(messageLogs.sentAt)).limit(1);
    return row?.at ?? null;
};

const TEMPLATE_LABELS = { renewal: "Renewal reminder", expired: "Plan expired" } as const;
type ChatTemplate = keyof typeof TEMPLATE_LABELS;

const templateParams = async (gymId: string, member: typeof members.$inferSelect) => {
    const [latest] = await db.select().from(memberships)
        .where(and(eq(memberships.primaryMemberId, member.id), ne(memberships.status, "upgraded")))
        .orderBy(desc(memberships.endDate)).limit(1);
    const gym = await findBranch(db, gymId);
    const today = getISTMidnightToday();
    const result: Partial<Record<ChatTemplate, { params: (string | number)[]; preview: string }>> = {};
    if (!latest) return { gymName: gym?.name ?? "Gym", templates: result };
    const gymName = gym?.name ?? "Gym";
    if (latest.endDate >= today) {
        const days = Math.round((latest.endDate.getTime() - today.getTime()) / DAY_MS);
        result.renewal = {
            params: [member.name, gymName, days, formatShortDate(latest.endDate)],
            preview: `Hi ${member.name}, your ${gymName} membership ends in ${days} day${days === 1 ? "" : "s"} (${formatShortDate(latest.endDate)}).`,
        };
    } else {
        result.expired = {
            params: [member.name, gymName, formatShortDate(latest.endDate)],
            preview: `Hi ${member.name}, your ${gymName} membership expired on ${formatShortDate(latest.endDate)}.`,
        };
    }
    return { gymName, templates: result };
};

const whatsappReady = async (gymId: string) => {
    const settings = await findSettings(db, gymId);
    return settings?.whatsappActive && settings.whatsappPhoneNumberId ? settings : null;
};

const THREAD_PAGE = 50;

export async function chatRoutes(fastify: FastifyInstance) {
    fastify.addHook("onRequest", fastify.authenticate);
    fastify.addHook("preHandler", requireFeature("whatsapp"));
    const canChat = { preHandler: requirePermission("whatsapp.chat") };

    fastify.get("/unread", canChat, async (request: FastifyRequest) => {
        const [{ total }] = await db.select({ total: count() }).from(messageLogs)
            .where(and(eq(messageLogs.branchId, user(request).gymId), eq(messageLogs.direction, "in"), isNull(messageLogs.seenAt)));
        return { success: true, data: { count: total } };
    });

    fastify.get("/threads", canChat, async (request: FastifyRequest) => {
        const { gymId } = user(request);
        const search = String((request.query as any)?.search ?? "").trim().toLowerCase();
        const rows = await db.select({
            log: messageLogs,
            member: { id: members.id, name: members.name, phoneNumber: members.phoneNumber, photo: members.profilePicture },
        })
            .from(messageLogs)
            .leftJoin(members, eq(members.id, messageLogs.memberId))
            .where(and(eq(messageLogs.branchId, gymId), ne(messageLogs.status, "skipped"), gte(messageLogs.sentAt, new Date(Date.now() - 90 * DAY_MS))))
            .orderBy(desc(messageLogs.sentAt))
            .limit(3000);

        const threads = new Map<string, any>();
        const now = Date.now();
        for (const { log, member } of rows) {
            const phone = member?.phoneNumber ? last10(member.phoneNumber) : last10(log.phone);
            if (!member?.id && !phone) continue;
            const key = member?.id ? `m:${member.id}` : `p:${phone}`;
            let thread = threads.get(key);
            if (!thread) {
                thread = {
                    key,
                    memberId: member?.id ?? null,
                    phone,
                    name: member?.name ?? (log.summary?.includes(":") && log.direction === "in" ? log.summary.split(":")[0] : null),
                    photo: member?.photo ?? null,
                    last: { body: log.body ?? log.summary ?? log.template ?? "", direction: log.direction, status: log.status, at: log.sentAt, template: log.template },
                    unread: 0,
                    windowOpen: false,
                };
                threads.set(key, thread);
            }
            if (log.direction === "in") {
                if (!log.seenAt) thread.unread += 1;
                if (now - log.sentAt.getTime() < DAY_MS) thread.windowOpen = true;
            }
        }
        // Inbound from an unknown number that later matched a client is folded into that client's thread.
        for (const [key, thread] of threads) {
            if (!key.startsWith("p:")) continue;
            const owner = [...threads.values()].find((t) => t.memberId && t.phone === thread.phone);
            if (!owner) continue;
            owner.unread += thread.unread;
            owner.windowOpen ||= thread.windowOpen;
            if (new Date(thread.last.at) > new Date(owner.last.at)) owner.last = thread.last;
            threads.delete(key);
        }
        let list = [...threads.values()].sort((a, b) => new Date(b.last.at).getTime() - new Date(a.last.at).getTime());
        if (search) list = list.filter((t) => (t.name ?? "").toLowerCase().includes(search) || t.phone.includes(search));
        return { success: true, data: list };
    });

    fastify.get("/thread", canChat, async (request: FastifyRequest, reply: FastifyReply) => {
        const { gymId } = user(request);
        const query = request.query as { memberId?: string; phone?: string; before?: string };
        // Pages of THREAD_PAGE, newest first; `before` (a message's `at`) loads the page older than it (CoreWave shape).
        const before = query.before ? new Date(query.before) : null;
        if (before && Number.isNaN(before.getTime())) return reply.status(400).send({ success: false, message: "Invalid cursor" });
        const resolved = await resolveTarget(gymId, query);
        if (!resolved) return reply.status(404).send({ success: false, message: "Chat not found" });
        const { target, member } = resolved;
        const where = threadWhere(gymId, target);

        const rows = await db.select({ log: messageLogs, senderName: users.name }).from(messageLogs)
            .leftJoin(users, eq(users.id, messageLogs.sentByUserId))
            .where(and(where, ne(messageLogs.status, "skipped"), before ? lt(messageLogs.sentAt, before) : undefined))
            .orderBy(desc(messageLogs.sentAt)).limit(THREAD_PAGE + 1);
        const hasMore = rows.length > THREAD_PAGE;
        if (hasMore) rows.pop();
        // Opening the thread (the newest page) is what marks the client's messages as seen.
        const unseen = before ? [] : rows.filter(({ log }) => log.direction === "in" && !log.seenAt).map(({ log }) => log.id);
        if (unseen.length) await db.update(messageLogs).set({ seenAt: new Date() }).where(inArray(messageLogs.id, unseen));

        const lastIn = await lastInboundAt(gymId, target);
        const windowEndsAt = lastIn && Date.now() - lastIn.getTime() < DAY_MS ? new Date(lastIn.getTime() + DAY_MS) : null;
        const settings = await whatsappReady(gymId);
        const templates = member ? (await templateParams(gymId, member)).templates : {};

        return {
            success: true,
            data: {
                memberId: target.memberId,
                phone: target.phone,
                name: member?.name ?? null,
                photo: member?.profilePicture ?? null,
                connected: !!settings,
                windowEndsAt,
                hasMore,
                templates: (Object.keys(TEMPLATE_LABELS) as ChatTemplate[])
                    .filter((key) => templates[key])
                    .map((key) => ({ key, label: TEMPLATE_LABELS[key], preview: templates[key]!.preview })),
                messages: rows.reverse().map(({ log, senderName }) => ({
                    _id: log.id,
                    direction: log.direction,
                    body: log.body ?? log.summary ?? "",
                    template: log.template,
                    status: log.status,
                    errorMessage: log.errorMessage,
                    at: log.sentAt,
                    sentBy: senderName ?? (log.direction === "out" && !log.sentByUserId ? "Automatic" : null),
                })),
            },
        };
    });

    fastify.post("/send", canChat, async (request: FastifyRequest, reply: FastifyReply) => {
        const { gymId, userId } = user(request);
        const body = (request.body ?? {}) as { memberId?: string; phone?: string; text?: string };
        const text = String(body.text ?? "").trim();
        if (!text) return reply.status(400).send({ success: false, message: "Type a message" });
        if (text.length > 4096) return reply.status(400).send({ success: false, message: "Message is too long" });
        const resolved = await resolveTarget(gymId, body);
        if (!resolved) return reply.status(404).send({ success: false, message: "Chat not found" });
        const settings = await whatsappReady(gymId);
        if (!settings) return reply.status(400).send({ success: false, message: "Connect WhatsApp first" });
        const lastIn = await lastInboundAt(gymId, resolved.target);
        if (!lastIn || Date.now() - lastIn.getTime() >= DAY_MS) {
            return reply.status(400).send({ success: false, message: "You can reply only within 24 hours of the client's last message. Send a template instead." });
        }
        const log = await sendWhatsAppText(toWhatsAppNumber(resolved.target.phone), text, whatsappConfig(settings), {
            gymId,
            clientId: resolved.target.memberId ?? undefined,
            sentByUserId: userId,
        });
        if (log.status === "failed") return reply.status(502).send({ success: false, message: log.errorMessage || "WhatsApp did not accept the message" });
        return { success: true, data: { _id: log.id, direction: "out", body: text, status: log.status, at: log.sentAt } };
    });

    fastify.post("/send-template", canChat, async (request: FastifyRequest, reply: FastifyReply) => {
        const { gymId, userId } = user(request);
        const body = (request.body ?? {}) as { memberId?: string; template?: string };
        const member = await findMember(db, body.memberId, gymId);
        if (!member) return reply.status(404).send({ success: false, message: "Client not found" });
        if (!(body.template && body.template in TEMPLATE_LABELS)) return reply.status(400).send({ success: false, message: "Unknown template" });
        const settings = await whatsappReady(gymId);
        if (!settings) return reply.status(400).send({ success: false, message: "Connect WhatsApp first" });
        const { gymName, templates } = await templateParams(gymId, member);
        const choice = templates[body.template as ChatTemplate];
        if (!choice) return reply.status(400).send({ success: false, message: "This template doesn't fit the client's current plan" });
        const sent = await sendWhatsAppTemplate(toWhatsAppNumber(member.phoneNumber), body.template, choice.params, whatsappConfig(settings), gymName, {
            gymId,
            clientId: member.id,
            sentByUserId: userId,
        });
        if (!sent) return reply.status(502).send({ success: false, message: "WhatsApp did not accept the template" });
        return { success: true };
    });
}
