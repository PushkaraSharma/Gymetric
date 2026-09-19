import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import crypto from 'crypto';
import MessageLog, { MESSAGE_LOG_STATUSES } from '../models/MessageLog.js';
import Client from '../models/Client.js';
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

const toCountMap = (groups: { _id: string; count: number }[]) => {
    const counts = emptyCounts();
    groups.forEach((g) => {
        if (g._id in counts) (counts as any)[g._id] = g.count;
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

                    const log = await MessageLog.findOne({ providerMessageId: wamid });
                    if (!log) {
                        console.warn('WhatsApp webhook no MessageLog for wamid', { suffix: wamidSuffix(wamid), nextStatus });
                        continue;
                    }
                    if (!shouldApplyWhatsAppStatus(log.status, nextStatus)) {
                        console.log('WhatsApp webhook status ignored (not newer)', { suffix: wamidSuffix(wamid), current: log.status, nextStatus });
                        continue;
                    }

                    const firstError = st?.errors?.[0];
                    log.status = nextStatus;
                    log.statusUpdatedAt = st?.timestamp
                        ? new Date(Number(st.timestamp) * 1000)
                        : new Date();
                    if (nextStatus === 'failed' && firstError) {
                        log.errorCode = firstError.code != null ? String(firstError.code) : log.errorCode;
                        log.errorMessage = firstError.title || firstError.message || log.errorMessage;
                    }
                    await log.save();
                    console.log('WhatsApp webhook status updated', { suffix: wamidSuffix(wamid), nextStatus });
                }
            }
        }

        return reply.status(200).send({ success: true });
    } catch (error: any) {
        request.log?.error?.(error);
        console.error('WhatsApp webhook error:', error);
        return reply.status(200).send({ success: true });
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

export const getWhatsAppSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = new mongoose.Types.ObjectId((request.user as any).gymId);
        const todayStart = getISTMidnightToday();
        const sevenDaysStart = addUtcDays(todayStart, -6);

        const [todayGroups, weekGroups, templateGroups] = await Promise.all([
            MessageLog.aggregate([
                { $match: { gymId, sentAt: { $gte: todayStart } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            MessageLog.aggregate([
                { $match: { gymId, sentAt: { $gte: sevenDaysStart } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            MessageLog.aggregate([
                { $match: { gymId, sentAt: { $gte: sevenDaysStart } } },
                { $group: { _id: { template: '$template', status: '$status' }, count: { $sum: 1 } } },
            ]),
        ]);

        const today = toCountMap(todayGroups);
        const last7Days = toCountMap(weekGroups);

        const byTemplate: Record<string, ReturnType<typeof emptyCounts>> = {};
        templateGroups.forEach((g: any) => {
            const template = g._id?.template || 'unknown';
            if (!byTemplate[template]) byTemplate[template] = emptyCounts();
            const status = g._id?.status;
            if (status && status in byTemplate[template]) {
                (byTemplate[template] as any)[status] += g.count;
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

export const getWhatsAppLogs = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { status, template, search, page = '1', limit = '30' } = request.query as any;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

        const filter: any = { gymId };
        if (status && status !== 'all' && (MESSAGE_LOG_STATUSES as readonly string[]).includes(status)) {
            filter.status = status;
        }
        if (template && template !== 'all' && (WHATSAPP_TEMPLATES as readonly string[]).includes(template)) {
            filter.template = template;
        }

        if (search?.trim()) {
            const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const clients = await Client.find({
                gymId,
                $or: [{ name: regex }, { phoneNumber: regex }],
            }).select('_id').lean();
            filter.clientId = { $in: clients.map((c: any) => c._id) };
        }

        const [items, total] = await Promise.all([
            MessageLog.find(filter)
                .sort({ sentAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('clientId', 'name phoneNumber')
                .lean(),
            MessageLog.countDocuments(filter),
        ]);

        return reply.send({
            success: true,
            data: {
                items: items.map((m: any) => ({
                    _id: m._id,
                    template: m.template,
                    status: m.status,
                    summary: m.summary,
                    errorMessage: m.errorMessage,
                    sentAt: m.sentAt,
                    client: m.clientId ? {
                        _id: m.clientId._id,
                        name: m.clientId.name,
                        phoneNumber: m.clientId.phoneNumber,
                    } : null,
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
