import { colors } from "@/theme/colors";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get('window');

export const DEVICE_WIDTH = width;
export const DEVICE_HEIGHT = height;

export const BG_ACTIVITY_COLOR: any = {
    'ONBOARDING': colors.successBackground,
    'RENEWAL': colors.primaryBackground,
    'EXPIRY': colors.errorBackground,
    'PAYMENT': colors.successBackground,
    'ADVANCE_RENEWAL': colors.primaryBackground
};

export const OTA_VERSION = 0

export const ONBOARDING_PURPOSES = [
    { label: 'Fat Loss', value: 'Fat Loss' },
    { label: 'Muscle Building', value: 'Muscle Building' },
    { label: 'General Fitness', value: 'General Fitness' },
    { label: 'Weight Gain', value: 'Weight Gain' },
    { label: 'Flexibility', value: 'Flexibility' },
    { label: 'Athletic Performance', value: 'Athletic Performance' },
    { label: 'Rehabilitation', value: 'Rehabilitation' },
    { label: 'Stress Relief', value: 'Stress Relief' }
];