import axios from 'axios';
import MessageLog from '../models/MessageLog.js';
import { graphErrorFromAxios } from '../utils/whatsappStatus.js';

export const sendWhatsAppTemplate = async (
    to: string,
    templateName: string,
    bodyParams: any[] = [],
    whatsapp: any,
    headerText: string = "",
    logContext?: { gymId: string; clientId?: string }
) => {
    const summary = `${templateName}: ${bodyParams.join(', ')}`;
    try {
        const url = `https://graph.facebook.com/v22.0/${whatsapp?.phoneNumberId}/messages`;
        const components = [];
        // Meta templates use an IMAGE header; gym name belongs in body params, not header text.
        if (whatsapp?.headerImageId) {
            components.push({
                type: "header",
                parameters: [
                    { type: "image", image: { id: whatsapp.headerImageId } },
                ],
            });
        } else if (headerText) {
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
            const providerMessageId = response.data?.messages?.[0]?.id;
            await MessageLog.create({
                gymId: logContext.gymId,
                clientId: logContext.clientId,
                channel: 'whatsapp',
                template: templateName,
                status: 'queued',
                summary,
                providerMessageId,
                statusUpdatedAt: new Date(),
            });
        }

        return response.data;
    } catch (error: any) {
        console.error("WhatsApp Error:", error.response?.data || error.message);
        if (logContext?.gymId) {
            const { errorCode, errorMessage } = graphErrorFromAxios(error);
            await MessageLog.create({
                gymId: logContext.gymId,
                clientId: logContext.clientId,
                channel: 'whatsapp',
                template: templateName,
                status: 'failed',
                summary,
                errorCode,
                errorMessage,
                statusUpdatedAt: new Date(),
            });
        }
    }
};

export const logSkippedWhatsApp = async (
    gymId: string,
    clientId: string,
    templateName: string,
    reason: string
) => {
    await MessageLog.create({
        gymId,
        clientId,
        channel: 'whatsapp',
        template: templateName,
        status: 'skipped',
        summary: reason,
        statusUpdatedAt: new Date(),
    });
};
