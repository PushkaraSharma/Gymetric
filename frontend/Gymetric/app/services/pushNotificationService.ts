import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './Api';

let isHandlerConfigured = false;

const ensureNotificationHandler = () => {
    if (isHandlerConfigured) return;
    isHandlerConfigured = true;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
    ensureNotificationHandler();
    if (!Device.isDevice) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4F46E5',
        });
    }

    return true;
};

export const registerPushToken = async (): Promise<void> => {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (tokenData?.data) {
            await api.savePushToken(tokenData.data);
        }
    } catch (error) {
        console.log('Push token registration failed:', error);
    }
};
