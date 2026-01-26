import { colors } from "@/theme/colors";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get('window');

export const DEVICE_WIDTH = width;
export const DEVICE_HEIGHT = height;

export const BG_ACTIVITY_COLOR: any = {
    'ONBOARDING': colors.activeBg,
    'RENEWAL': colors.palette.accent100,
    'EXPIRY': colors.errorBackground,
    'PAYMENT': colors.activeBg,
    'ADVANCE_RENEWAL': colors.palette.accent100
};

export const OTA_VERSION = 2