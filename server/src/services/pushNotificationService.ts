import axios from 'axios';

export const sendExpoPush = async (
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
) => {
    try {
        await axios.post('https://exp.host/--/api/v2/push/send', {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data: data || {},
        });
        return true;
    } catch (error: any) {
        console.error('Expo Push Error:', error.response?.data || error.message);
        return false;
    }
};
