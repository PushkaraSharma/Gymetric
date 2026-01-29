import axios from 'axios';

export const sendWhatsAppTemplate = async (to: string, templateName: string, bodyParams: any[] = [], whatsapp: any) => {
    try {
        const url = `https://graph.facebook.com/v22.0/${whatsapp?.phoneNumberId}/messages`;
        const components = [];
        if (whatsapp?.headerImageId) {
            components.push({
                type: "header",
                parameters: [
                    {
                        type: "image",
                        image: { id: whatsapp?.headerImageId }
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
        return response.data;
    } catch (error: any) {
        console.error("WhatsApp Error:", error.response?.data || error.message);
    }
};