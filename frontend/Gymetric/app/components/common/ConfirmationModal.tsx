import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Modal,
} from 'react-native';
import { useAppTheme } from '@/theme/context';
import { Trash2, AlertTriangle } from 'lucide-react-native';
import { Button } from '../Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticsError, hapticsHeavy } from '@/utils/haptics';

interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
    children?: React.ReactNode;
}

export function ConfirmationModal({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
    children
}: ConfirmationModalProps) {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(theme, isDark, variant);

    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <Trash2 size={32} color={theme.colors.error} />;
            case 'warning':
                return <AlertTriangle size={32} color={theme.colors.error} />;
            default:
                return <AlertTriangle size={32} color={theme.colors.primary} />;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.dismissArea} onPress={onClose} />
                <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            {getIcon()}
                        </View>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                        {children && <View style={styles.customContent}>{children}</View>}
                    </View>

                    <View style={styles.actions}>
                        <Button
                            title={cancelText}
                            onPress={onClose}
                            variant="outline"
                            style={styles.actionBtn}
                            disabled={loading}
                        />
                        <Button
                            title={confirmText}
                            onPress={() => {
                                variant === 'danger' ? hapticsHeavy() : hapticsError();
                                onConfirm();
                            }}
                            variant="primary"
                            style={StyleSheet.flatten([
                                styles.actionBtn,
                                variant === 'danger' ? { backgroundColor: theme.colors.error } : {}
                            ])}
                            loading={loading}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (theme: any, isDark: boolean, variant: string) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    dismissArea: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        alignItems: 'center'
    },
    header: {
        paddingTop: theme.spacing.lg,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative'
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: variant === 'danger' ? (isDark ? '#EF444420' : '#FEE2E2') : (isDark ? '#F59E0B20' : '#FFFBEB'),
        justifyContent: 'center',
        alignItems: 'center'
    },
    body: {
        alignItems: 'center',
        marginBottom: 32
    },
    title: {
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.text,
        marginBottom: 12,
        textAlign: 'center'
    },
    message: {
        fontSize: 16,
        color: theme.colors.textDim,
        textAlign: 'center',
        lineHeight: 24
    },
    customContent: {
        width: '100%',
        marginTop: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    actionBtn: {
        flex: 1
    }
});
