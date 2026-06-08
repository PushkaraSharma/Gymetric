import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { hapticsLight } from '@/utils/haptics';

export interface ButtonProps {
    title: string;
    onPress?: () => void;
    variant?: 'primary' | 'outline' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    icon?: React.ReactNode;
    LeftAccessory?: React.ComponentType<{ style: any }>;
    RightAccessory?: React.ComponentType<{ style: any }>;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
    LeftAccessory,
    RightAccessory
}: ButtonProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);

    const getBackgroundColor = () => {
        if (disabled) return theme.colors.palette.slate400;
        if (variant === 'primary') return theme.colors.primary;
        return 'transparent';
    };

    const getBorderColor = () => {
        if (disabled) return theme.colors.palette.slate400;
        if (variant === 'outline') return theme.colors.border;
        return 'transparent';
    };

    const getTextColor = () => {
        if (variant === 'primary') return '#FFFFFF';
        if (variant === 'ghost') return theme.colors.textDim;
        return theme.colors.text;
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1 : 0,
                },
                style,
            ]}
            onPress={() => { hapticsLight(); onPress?.(); }}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {LeftAccessory && <LeftAccessory style={{ marginRight: 8 }} />}
                    {icon && <>{icon}</>}
                    <Text style={[styles.text, { color: getTextColor(), marginLeft: icon || LeftAccessory ? 8 : 0, marginRight: RightAccessory ? 8 : 0 }, textStyle]}>{title}</Text>
                    {RightAccessory && <RightAccessory style={{ marginLeft: 8 }} />}
                </>
            )}
        </TouchableOpacity>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    text: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
    },
});
