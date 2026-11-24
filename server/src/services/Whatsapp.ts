import axios from 'axios';
import { db } from '../db/client.js';
import { messageLogs } from '../db/schema.js';
import { validId } from '../db/queries.js';
import { graphErrorFromAxios } from '../utils/whatsappStatus.js';

const IMAGE_HEADER_TEMPLATES = new Set(['onboarding']);
const TEXT_HEADER_TEMPLATES = new Set(['renewal', 'renewal_complete', 'expired']);

type LogContext = { gymId: string; clientId?: string; sentByUserId?: string };

const insertLog = (values: Omit<typeof messageLogs.$inferInsert, 'branchId' | 'memberId'> & { gymId: string; clientId?: string }) => {
    const { gymId, clientId, ...rest } = values;
    return db.insert(messageLogs).values({
        ...rest,
        branchId: gymId,
        memberId: validId(clientId),
        channel: 'whatsapp',
        statusUpdatedAt: new Date(),
    }).returning();
};

export const toWhatsAppNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 ? `91${digits}` : digits;
};

export const sendWhatsAppTemplate = async (
    to: string,
    templateName: string,
    bodyParams: any[] = [],
    whatsapp: any,
    headerText: string = "",
    logContext?: LogContext
) => {
    const summary = `${templateName}: ${bodyParams.join(', ')}`;
    if (IMAGE_HEADER_TEMPLATES.has(templateName) && !whatsapp?.headerImageUrl) {
        if (logContext?.gymId) {
            await logSkippedWhatsApp(
                logContext.gymId,
                logContext.clientId || '',
                templateName,
                'Skipped: welcome image is not uploaded'
            );
        }
        return;
    }
    try {
        const url = `https://graph.facebook.com/v22.0/${whatsapp?.phoneNumberId}/messages`;
        const components = [];
        if (IMAGE_HEADER_TEMPLATES.has(templateName) && whatsapp?.headerImageUrl) {
            components.push({
                type: "header",
                parameters: [
                    { type: "image", image: { link: whatsapp.headerImageUrl } },
                ],
            });
        } else if (TEXT_HEADER_TEMPLATES.has(templateName) && headerText) {
            components.push({
                type: "header",
                parameters: [{ type: "text", text: headerText }],
            });
        }
        if (bodyParams.length > 0) {
            components.push({
                type: "body",
                parameters: bodyParams.map(text => ({
                    type: "text",
                    text: String(text)
                }))
            });
        }
        const data = {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: templateName,
                language: { code: "en" },
                components
            }
        };
        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${whatsapp?.accessToken}` }
        });

        if (logContext?.gymId) {
            await insertLog({
                gymId: logContext.gymId,
                clientId: logContext.clientId,
                phone: to,
                template: templateName,
                status: 'queued',
                summary,
                providerMessageId: response.data?.messages?.[0]?.id,
                sentByUserId: logContext.sentByUserId,
            });
        }

        return response.data;
    } catch (error: any) {
        console.error("WhatsApp Error:", error.response?.data || error.message);
        if (logContext?.gymId) {
            const { errorCode, errorMessage } = graphErrorFromAxios(error);
            await insertLog({
                gymId: logContext.gymId,
                clientId: logContext.clientId,
                phone: to,
                template: templateName,
                status: 'failed',
                summary,
                errorCode,
                errorMessage,
                sentByUserId: logContext.sentByUserId,
            }).catch((logError) => console.error('WhatsApp log insert failed:', logError));
        }
    }
};

// Free-form text is only accepted by Meta within 24 hours of the client's last message.
export const sendWhatsAppText = async (to: string, text: string, whatsapp: any, logContext: LogContext) => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v22.0/${whatsapp?.phoneNumberId}/messages`,
            { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
            { headers: { Authorization: `Bearer ${whatsapp?.accessToken}` } },
        );
        const [log] = await insertLog({
            gymId: logContext.gymId,
            clientId: logContext.clientId,
            phone: to,
            body: text,
            status: 'queued',
            summary: text.slice(0, 120),
            providerMessageId: response.data?.messages?.[0]?.id,
            sentByUserId: logContext.sentByUserId,
        });
        return log;
    } catch (error: any) {
        console.error("WhatsApp text error:", error.response?.data || error.message);
        const { errorCode, errorMessage } = graphErrorFromAxios(error);
        const [log] = await insertLog({
            gymId: logContext.gymId,
            clientId: logContext.clientId,
            phone: to,
            body: text,
            status: 'failed',
            summary: text.slice(0, 120),
            errorCode,
            errorMessage,
            sentByUserId: logContext.sentByUserId,
        });
        return log;
    }
};

export const logSkippedWhatsApp = async (
    gymId: string,
    clientId: string,
    templateName: string,
    reason: string
) => {
    await insertLog({
        gymId,
        clientId,
        template: templateName,
        status: 'skipped',
        summary: reason,
    });
};
