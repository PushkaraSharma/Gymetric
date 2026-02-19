import React from 'react';
import { Modal, View, StyleSheet, TouchableWithoutFeedback, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { Text } from './Text';
import { Button } from './Button';
import { ThemedStyle } from '@/theme/types';

interface CustomModalProps {
    visible: boolean;
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'default' | 'destructive';
}

export const CustomModal = ({
    visible,
    title,
    message,
    onCancel,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'default'
}: CustomModalProps) => {
    const { themed, theme: { colors, spacing } } = useAppTheme();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={themed($overlay)}>
                    <TouchableWithoutFeedback>
                        <View style={themed($modalContainer)}>
                            <Text preset="subheading" weight="bold" style={{ marginBottom: spacing.xs, textAlign: 'center' }}>{title}</Text>
                            <Text style={{ marginBottom: spacing.lg, color: colors.textDim }}>{message}</Text>

                            <View style={$buttonContainer}>
                                <Button
                                    text={cancelText}
                                    preset="default"
                                    style={{ flex: 1, marginRight: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                                    textStyle={{ color: colors.text }}
                                    onPress={onCancel}
                                />
                                <Button
                                    text={confirmText}
                                    textStyle={{ color: colors.white }}
                                    preset={type === 'destructive' ? 'filled' : 'filled'}
                                    style={{ flex: 1, marginLeft: spacing.sm, backgroundColor: type === 'destructive' ? colors.error : colors.primary }}
                                    onPress={onConfirm}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const $overlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
});

const $modalContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
});

const $buttonContainer: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
};
