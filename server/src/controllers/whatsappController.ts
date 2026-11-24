import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { and, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { branchSettings, members, messageLogs } from '../db/schema.js';
import { MESSAGE_LOG_STATUSES } from '../utils/Constants.js';
import { getISTMidnightToday, addUtcDays } from '../utils/timeUtils.js';
import { shouldApplyWhatsAppStatus } from '../utils/whatsappStatus.js';

const META_STATUSES = new Set(['sent', 'delivered', 'read', 'failed']);
const WHATSAPP_TEMPLATES = ['onboarding', 'renewal', 'renewal_complete', 'expired'] as const;

const emptyCounts = () => ({
    queued: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    skipped: 0,
    total: 0,
});

const toCountMap = (groups: { status: string; count: number }[]) => {
    const counts = emptyCounts();
    groups.forEach((g) => {
        if (g.status in counts) (counts as any)[g.status] = g.count;
        counts.total += g.count;
    });
    return counts;
};

const deliveryRate = (counts: ReturnType<typeof emptyCounts>) => {
    const deliveredLike = counts.delivered + counts.read;
    const attempted = counts.queued + counts.sent + counts.delivered + counts.read + counts.failed;
    if (attempted === 0) return 0;
    return Math.round((deliveredLike / attempted) * 100);
};

export const verifyWhatsAppWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const mode = query['hub.mode'] || query.hub?.mode;
    const token = query['hub.verify_token'] || query.hub?.verify_token;
    const challenge = query['hub.challenge'] || query.hub?.challenge;
    const tokenOk = !!(mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN);
    console.log('WhatsApp webhook verify', { mode, tokenOk, hasChallenge: !!challenge });
    if (tokenOk) {
        return reply.status(200).header('Content-Type', 'text/plain').send(String(challenge ?? ''));
    }
    return reply.status(403).send({ success: false, message: 'Forbidden' });
};

const wamidSuffix = (id?: string) => (id && id.length > 8 ? id.slice(-8) : id || '');

export const handleWhatsAppWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const signature = request.headers['x-hub-signature-256'] as string | undefined;
        const rawIsString = typeof request.body === 'string';
        if (process.env.WHATSAPP_APP_SECRET) {
            if (rawIsString) {
                if (!verifyMetaSignature(request.body as string, signature)) {
                    console.warn('WhatsApp webhook signature rejected');
                    return reply.status(200).send({ success: true });
                }
                console.log('WhatsApp webhook signature ok');
            } else {
                console.warn('WhatsApp webhook signature skipped (parsed JSON body, no raw payload)');
            }
        }

        const body = rawIsString ? JSON.parse(request.body as string) : request.body as any;
        const entries = body?.entry || [];
        let statusCount = 0;
        let inboundCount = 0;
        for (const entry of entries) {
            for (const change of entry?.changes || []) {
                statusCount += (change?.value?.statuses || []).length;
                inboundCount += (change?.value?.messages || []).length;
            }
        }
        console.log('WhatsApp webhook POST', { entries: entries.length, statuses: statusCount, inboundMessages: inboundCount });

        for (const entry of entries) {
            for (const change of entry?.changes || []) {
                const statuses = change?.value?.statuses || [];
                for (const st of statuses) {
                    const wamid = st?.id;
                    const nextStatus = String(st?.status || '').toLowerCase();
                    if (!wamid || !META_STATUSES.has(nextStatus)) {
                        console.log('WhatsApp webhook status skipped', { suffix: wamidSuffix(wamid), nextStatus });
                        continue;
                    }

                    const [log] = await db.select().from(messageLogs).where(eq(messageLogs.providerMessageId, wamid)).limit(1);
                    if (!log) {
                        console.warn('WhatsApp webhook no MessageLog for wamid', { suffix: wamidSuffix(wamid), nextStatus });
                        continue;
                    }
                    if (!shouldApplyWhatsAppStatus(log.status, nextStatus)) {
                        console.log('WhatsApp webhook status ignored (not newer)', { suffix: wamidSuffix(wamid), current: log.status, nextStatus });
                        continue;
                    }

                    const firstError = st?.errors?.[0];
                    const update: Partial<typeof messageLogs.$inferInsert> = {
                        status: nextStatus,
                        statusUpdatedAt: st?.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date(),
                        updatedAt: new Date(),
                    };
                    if (nextStatus === 'failed' && firstError) {
                        update.errorCode = firstError.code != null ? String(firstError.code) : log.errorCode;
                        update.errorMessage = firstError.title || firstError.message || log.errorMessage;
                    }
                    await db.update(messageLogs).set(update).where(eq(messageLogs.id, log.id));
                    console.log('WhatsApp webhook status updated', { suffix: wamidSuffix(wamid), nextStatus });
                }

                const inbound = change?.value?.messages || [];
                if (inbound.length) await storeInbound(change.value.metadata?.phone_number_id, inbound, change.value.contacts || []);
            }
        }

        return reply.status(200).send({ success: true });
    } catch (error: any) {
        request.log?.error?.(error);
        console.error('WhatsApp webhook error:', error);
        return reply.status(200).send({ success: true });
    }
};

const inboundText = (message: any) => {
    switch (message?.type) {
        case 'text': return message.text?.body ?? '';
        case 'button': return message.button?.text ?? '[Button]';
        case 'interactive': return message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? '[Reply]';
        case 'image': return message.image?.caption ? `[Photo] ${message.image.caption}` : '[Photo]';
        case 'video': return '[Video]';
        case 'audio': return '[Voice message]';
        case 'document': return `[Document] ${message.document?.filename ?? ''}`.trim();
        case 'sticker': return '[Sticker]';
        case 'location': return '[Location]';
        default: return `[${message?.type ?? 'Message'}]`;
    }
};

const storeInbound = async (phoneNumberId: string | undefined, messages: any[], contacts: any[]) => {
    if (!phoneNumberId) return;
    const [setting] = await db.select({ branchId: branchSettings.branchId }).from(branchSettings)
        .where(eq(branchSettings.whatsappPhoneNumberId, phoneNumberId)).limit(1);
    if (!setting) {
        console.warn('WhatsApp inbound for unknown phone number id');
        return;
    }
    for (const message of messages) {
        const from = String(message?.from ?? '');
        if (!from || !message?.id) continue;
        const local = from.slice(-10);
        const [member] = await db.select({ id: members.id }).from(members)
            .where(and(eq(members.branchId, setting.branchId), eq(members.phoneNumber, local)))
            .limit(1);
        const name = contacts.find((c: any) => c?.wa_id === from)?.profile?.name;
        const body = inboundText(message);
        await db.insert(messageLogs).values({
            branchId: setting.branchId,
            memberId: member?.id ?? null,
            channel: 'whatsapp',
            direction: 'in',
            phone: from,
            body,
            status: 'received',
            summary: name ? `${name}: ${body}`.slice(0, 120) : body.slice(0, 120),
            providerMessageId: message.id,
            sentAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
            statusUpdatedAt: new Date(),
        }).onConflictDoNothing();
    }
};

const verifyMetaSignature = (rawBody: string, signatureHeader?: string) => {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) return true;
    if (!signatureHeader?.startsWith('sha256=')) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signatureHeader.slice('sha256='.length);
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
    } catch {
        return false;
    }
};

const statusCounts = (gymId: string, since: Date) => db
    .select({ status: messageLogs.status, count: count() })
    .from(messageLogs)
    .where(and(eq(messageLogs.branchId, gymId), eq(messageLogs.direction, 'out'), gte(messageLogs.sentAt, since)))
    .groupBy(messageLogs.status);

export const getWhatsAppSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const todayStart = getISTMidnightToday();
        const sevenDaysStart = addUtcDays(todayStart, -6);

        const [todayGroups, weekGroups, templateGroups] = await Promise.all([
            statusCounts(gymId, todayStart),
            statusCounts(gymId, sevenDaysStart),
            db.select({ template: messageLogs.template, status: messageLogs.status, count: count() })
                .from(messageLogs)
                .where(and(eq(messageLogs.branchId, gymId), eq(messageLogs.direction, 'out'), gte(messageLogs.sentAt, sevenDaysStart)))
                .groupBy(messageLogs.template, messageLogs.status),
        ]);

        const today = toCountMap(todayGroups);
        const last7Days = toCountMap(weekGroups);

        const byTemplate: Record<string, ReturnType<typeof emptyCounts>> = {};
        templateGroups.forEach((g) => {
            const template = g.template || 'unknown';
            if (!byTemplate[template]) byTemplate[template] = emptyCounts();
            if (g.status && g.status in byTemplate[template]) {
                (byTemplate[template] as any)[g.status] += g.count;
            }
            byTemplate[template].total += g.count;
        });

        return reply.send({
            success: true,
            data: {
                today: { ...today, deliveryRate: deliveryRate(today) },
                last7Days: { ...last7Days, deliveryRate: deliveryRate(last7Days) },
                byTemplate,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export const getWhatsAppLogs = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { status, template, search, page = '1', limit = '30' } = request.query as any;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

        const filters: SQL[] = [eq(messageLogs.branchId, gymId), eq(messageLogs.direction, 'out')];
        if (status && status !== 'all' && (MESSAGE_LOG_STATUSES as readonly string[]).includes(status)) {
            filters.push(eq(messageLogs.status, status));
        }
        if (template && template !== 'all' && (WHATSAPP_TEMPLATES as readonly string[]).includes(template)) {
            filters.push(eq(messageLogs.template, template));
        }

        if (search?.trim()) {
            const pattern = `%${escapeLike(search.trim())}%`;
            const matches = await db.select({ id: members.id }).from(members)
                .where(and(eq(members.branchId, gymId), or(ilike(members.name, pattern), ilike(members.phoneNumber, pattern))));
            const ids = matches.map((m) => m.id);
            filters.push(ids.length ? inArray(messageLogs.memberId, ids) : sql`false`);
        }

        const where = and(...filters);
        const [items, [{ total }]] = await Promise.all([
            db.select({ log: messageLogs, client: { _id: members.id, name: members.name, phoneNumber: members.phoneNumber } })
                .from(messageLogs)
                .leftJoin(members, eq(members.id, messageLogs.memberId))
                .where(where)
                .orderBy(desc(messageLogs.sentAt))
                .offset((pageNum - 1) * limitNum)
                .limit(limitNum),
            db.select({ total: count() }).from(messageLogs).where(where),
        ]);

        return reply.send({
            success: true,
            data: {
                items: items.map(({ log, client }) => ({
                    _id: log.id,
                    template: log.template ?? undefined,
                    status: log.status,
                    summary: log.summary ?? undefined,
                    errorMessage: log.errorMessage ?? undefined,
                    sentAt: log.sentAt,
                    client: client?._id ? client : null,
                })),
                page: pageNum,
                limit: limitNum,
                total,
                hasMore: pageNum * limitNum < total,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
