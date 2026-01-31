import React from 'react';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { View, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { Text } from './Text';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

export const useToastConfig = () => {
    const { theme: { colors, spacing, typography } } = useAppTheme();

    const baseContainerStyle: ViewStyle = {
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        width: '94%',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.palette.slate900,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    };

    const textContainerStyle: ViewStyle = {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    };

    const titleStyle: TextStyle = {
        fontSize: 15,
        fontFamily: typography.primary.medium,
        color: colors.text,
        lineHeight: 20,
    };

    const messageStyle: TextStyle = {
        fontSize: 13,
        fontFamily: typography.primary.normal,
        color: colors.textDim,
        marginTop: 2,
        lineHeight: 18,
    };

    const config: ToastConfig = {
        success: (props) => (
            <View style={[baseContainerStyle, { borderLeftWidth: 6, borderLeftColor: colors.success }]}>
                <CheckCircle2 size={24} color={colors.success} strokeWidth={2.5} />
                <View style={textContainerStyle}>
                    {props.text1 && <Text numberOfLines={1} style={titleStyle}>{props.text1}</Text>}
                    {props.text2 && <Text numberOfLines={2} style={messageStyle}>{props.text2}</Text>}
                </View>
            </View>
        ),
        error: (props) => (
            <View style={[baseContainerStyle, { borderLeftWidth: 6, borderLeftColor: colors.error }]}>
                <AlertCircle size={24} color={colors.error} strokeWidth={2.5} />
                <View style={textContainerStyle}>
                    {props.text1 && <Text numberOfLines={1} style={titleStyle}>{props.text1}</Text>}
                    {props.text2 && <Text numberOfLines={2} style={messageStyle}>{props.text2}</Text>}
                </View>
            </View>
        ),
        info: (props) => (
            <View style={[baseContainerStyle, { borderLeftWidth: 6, borderLeftColor: colors.primary }]}>
                <Info size={24} color={colors.primary} strokeWidth={2.5} />
                <View style={textContainerStyle}>
                    {props.text1 && <Text numberOfLines={1} style={titleStyle}>{props.text1}</Text>}
                    {props.text2 && <Text numberOfLines={2} style={messageStyle}>{props.text2}</Text>}
                </View>
            </View>
        ),
    };

    return config;
};
