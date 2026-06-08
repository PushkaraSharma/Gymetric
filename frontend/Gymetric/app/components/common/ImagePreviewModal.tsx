import React from 'react'
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'

type Props = {
    visible: boolean
    imageUrl?: string
    onClose: () => void
}

export const ImagePreviewModal = ({ visible, imageUrl, onClose }: Props) => {
    const { theme: { colors } } = useAppTheme()

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <Pressable style={[styles.closeButton, { backgroundColor: colors.surface }]} onPress={onClose}>
                    <X size={22} color={colors.text} />
                </Pressable>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
                ) : null}
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.88)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    closeButton: {
        position: 'absolute',
        top: 54,
        right: 18,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    image: {
        width: '100%',
        height: '82%',
    },
})
