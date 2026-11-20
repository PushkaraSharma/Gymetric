import axios from 'axios';
import { db } from '../db/client.js';
import { messageLogs } from '../db/schema.js';
import { validId } from '../db/queries.js';
import { graphErrorFromAxios } from '../utils/whatsappStatus.js';

const IMAGE_HEADER_TEMPLATES = new Set(['onboarding']);
const TEXT_HEADER_TEMPLATES = new Set(['renewal', 'renewal_complete', 'expired']);

const insertLog = (values: Omit<typeof messageLogs.$inferInsert, 'branchId' | 'memberId'> & { gymId: string; clientId?: string }) => {
    const { gymId, clientId, ...rest } = values;
    return db.insert(messageLogs).values({
        ...rest,
        branchId: gymId,
        memberId: validId(clientId),
        channel: 'whatsapp',
        statusUpdatedAt: new Date(),
    });
};

export const sendWhatsAppTemplate = async (
    to: string,
    templateName: string,
    bodyParams: any[] = [],
    whatsapp: any,
    headerText: string = "",
    logContext?: { gymId: string; clientId?: string }
) => {
    const summary = `${templateName}: ${bodyParams.join(', ')}`;
    if (!whatsapp?.headerImageUrl) {
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
                template: templateName,
                status: 'queued',
                summary,
                providerMessageId: response.data?.messages?.[0]?.id,
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
                template: templateName,
                status: 'failed',
                summary,
                errorCode,
                errorMessage,
            }).catch((logError) => console.error('WhatsApp log insert failed:', logError));
        }
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
