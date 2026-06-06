import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '@/theme/context';

export interface HeaderProps {
    title?: string;
    subTitle?: string;
    centerAction?: React.ReactNode;
    leftAction?: React.ReactNode;
    onBack?: () => void;
    rightAction?: React.ReactNode;
    showBack?: boolean;

    // Legacy support to prevent TS errors on old screens
    leftIcon?: string;
    onLeftPress?: () => void;
    backgroundColor?: string;
    RightActionComponent?: React.ReactNode;
}

export function Header({
    title,
    subTitle,
    centerAction,
    leftAction,
    onBack,
    rightAction,
    showBack = true,
    leftIcon,
    onLeftPress,
    backgroundColor,
    RightActionComponent,
}: HeaderProps) {
    const navigation = useNavigation();
    const { theme } = useAppTheme();
    const styles = getStyles(theme);

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (onLeftPress) {
            onLeftPress();
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    const finalRightAction = rightAction || RightActionComponent;

    return (
        <View style={[styles.header, backgroundColor ? { backgroundColor } : null]}>
            <View style={styles.left}>
                {leftAction ? (
                    leftAction
                ) : (showBack || leftIcon) ? (
                    <Pressable onPress={handleBack} style={styles.backBtn}>
                        <ArrowLeft size={24} color={theme.colors.text} />
                    </Pressable>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>

            <View style={styles.center}>
                {centerAction ? (
                    centerAction
                ) : (
                    <>
                        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                        {subTitle ? (
                            <Text style={styles.headerSubtitle} numberOfLines={1}>{subTitle}</Text>
                        ) : null}
                    </>
                )}
            </View>

            <View style={styles.right}>
                {finalRightAction ? (
                    <View style={styles.rightAction}>
                        {finalRightAction}
                    </View>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        height: 60,
    },
    left: {
        width: 44,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    right: {
        width: 44,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.text,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        color: theme.colors.textDim,
        textAlign: 'center',
        marginTop: -2,
    },
    rightAction: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    placeholder: {
        width: 44,
    }
});
