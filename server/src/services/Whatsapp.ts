import axios from 'axios';
import MessageLog from '../models/MessageLog.js';

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
        if (whatsapp?.headerImageId || headerText) {
            components.push({
                type: "header",
                parameters: [
                    {
                        type: headerText ? "text" : "image",
                        ...(headerText ? { text: headerText } : { image: { id: whatsapp?.headerImageId } })
                    }
                ]
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
            await MessageLog.create({
                gymId: logContext.gymId,
                clientId: logContext.clientId,
                channel: 'whatsapp',
                template: templateName,
                status: 'sent',
                summary,
            });
        }

        return response.data;
    } catch (error: any) {
        console.error("WhatsApp Error:", error.response?.data || error.message);
        if (logContext?.gymId) {
            await MessageLog.create({
                gymId: logContext.gymId,
                clientId: logContext.clientId,
                channel: 'whatsapp',
                template: templateName,
                status: 'failed',
                summary,
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
    });
};
