import React, { useRef, useState } from 'react'
import { ActivityIndicator, Modal, View, ViewStyle } from 'react-native'
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { api } from '@/services/Api'
import Toast from 'react-native-toast-message'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
    visible: boolean
    onClose: () => void
    onSaved: (url: string) => void
}

export const SignatureModal = ({ visible, onClose, onSaved }: Props) => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const insets = useSafeAreaInsets();
    const ref = useRef<SignatureViewRef>(null)
    const [saving, setSaving] = useState(false)

    const handleSignature = async (dataUrl: string) => {
        setSaving(true)
        const response = await api.uploadReceiptAsset(dataUrl, 'signature')
        setSaving(false)
        if (response.kind === 'ok') {
            onSaved(response.data?.url)
            onClose()
        }
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={themed($container)}>
                <Header title="Draw Signature" leftIcon="caretLeft" onLeftPress={onClose} safeAreaTop backgroundColor={colors.surface} />
                <View style={themed($pad)}>
                    <SignatureScreen
                        ref={ref}
                        onOK={handleSignature}
                        onEmpty={() => Toast.show({ type: 'error', text1: 'Draw a signature first' })}
                        descriptionText=""
                        clearText="Clear"
                        confirmText="Save"
                        trimWhitespace
                        webStyle={signatureWebStyle}
                    />
                    {saving && (
                        <View style={themed($savingOverlay)}>
                            <ActivityIndicator color={colors.primary} />
                            <Text size="xs" style={{ color: colors.textDim, marginTop: spacing.xs }}>Uploading signature...</Text>
                        </View>
                    )}
                </View>
                <View style={[themed($actions), { paddingBottom: insets.bottom }]}>
                    <Button title="Clear" variant="outline" style={{ flex: 1, backgroundColor: colors.surface }} onPress={() => ref.current?.clearSignature()} disabled={saving} />
                    <Button title="Save" style={{ flex: 1 }} onPress={() => ref.current?.readSignature()} disabled={saving} />
                </View>
            </View>
        </Modal>
    )
}

const signatureWebStyle = `
    .m-signature-pad { box-shadow: none; border: none; margin: 0; }
    .m-signature-pad--body { border: none; margin: 0; }
    .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; }
    .m-signature-pad--footer { display: none; margin: 0; }
    body, html { background: transparent; width: 100%; height: 100%; margin: 0; padding: 0; }
`

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
    flex: 1,
    backgroundColor: colors.background,
})

const $pad: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flex: 1,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white,
})

const $savingOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
})

const $actions: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
})
