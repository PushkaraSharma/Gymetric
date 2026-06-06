import React from 'react';
import { View, Text, Switch as RNSwitch, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { hapticsSelection } from '@/utils/haptics';

export interface SwitchProps {
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    onPress?: (value: boolean) => void;
    label?: string;
    helper?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

export function Switch({ value, onValueChange, onPress, label, helper, containerStyle }: SwitchProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);

    const handleValueChange = (v: boolean) => {
        hapticsSelection();
        if (onValueChange) onValueChange(v);
        if (onPress) onPress(v);
    };

    const switchComponent = (
        <RNSwitch
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor={theme.colors.border}
            onValueChange={handleValueChange}
            value={value}
            style={styles.switch}
        />
    );

    if (!label && !helper) {
        return switchComponent;
    }

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={styles.row}>
                <View style={styles.textContainer}>
                    {label && <Text style={styles.label}>{label}</Text>}
                    {helper && <Text style={styles.helper}>{helper}</Text>}
                </View>
                {switchComponent}
            </View>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        marginVertical: theme.spacing.xs,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    label: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.medium,
        color: theme.colors.text,
    },
    helper: {
        fontSize: theme.typography.s,
        color: theme.colors.textDim,
        marginTop: 4,
    },
    switch: {
        transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
    }
});
