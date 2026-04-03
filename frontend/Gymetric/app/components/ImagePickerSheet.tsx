import React from 'react';
import { Modal, View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { Text } from './Text';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';
import { ThemedStyle } from '@/theme/types';
import { $styles } from '@/theme/styles';

interface ImagePickerSheetProps {
    isVisible: boolean;
    onSelect: (type: 'camera' | 'gallery') => void;
}

export const ImagePickerSheet = ({ isVisible, onSelect }: ImagePickerSheetProps) => {
    const { themed, theme: { colors, spacing } } = useAppTheme();

    if (!isVisible) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="slide"
            // Non-dismissible
            onRequestClose={() => {}} 
        >
            <View style={themed($overlay)}>
                <View style={themed($sheetContainer)}>
                    <View style={themed($handle)} />
                    
                    <Text preset="subheading" weight="bold" style={{ marginBottom: spacing.md, textAlign: 'center' }}>
                        Select Photo
                    </Text>
                    <Text style={{ marginBottom: spacing.xl, color: colors.textDim, textAlign: 'center' }}>
                        Choose an option to upload your photo
                    </Text>

                    <View style={$optionsContainer}>
                        <Button
                            preset="default"
                            style={themed($optionButton)}
                            onPress={() => onSelect('camera')}
                            LeftAccessory={() => (
                                <Ionicons name="camera-outline" size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
                            )}
                        >
                            <Text weight="medium">Take Photo</Text>
                        </Button>

                        <Button
                            preset="default"
                            style={[themed($optionButton), { marginTop: spacing.md }]}
                            onPress={() => onSelect('gallery')}
                            LeftAccessory={() => (
                                <Ionicons name="images-outline" size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
                            )}
                        >
                            <Text weight="medium">Choose from Gallery</Text>
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const $overlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
});

const $sheetContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    minHeight: 300,
});

const $handle: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
});

const $optionsContainer: ViewStyle = {
    flexDirection: 'column',
};

const $optionButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
});
