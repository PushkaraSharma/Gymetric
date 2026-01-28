import axios from 'axios';

export const sendWhatsAppTemplate = async (to, templateName, bodyParams = [], headerImageId = null) => {
    try {
        const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const components = [];
        if (headerImageId) {
            components.push({
                type: "header",
                parameters: [
                    {
                        type: "image",
                        image: { id: headerImageId }
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
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
        });
        return response.data;
    } catch (error) {
        console.error("WhatsApp Error:", error.response?.data || error.message);
    }
};