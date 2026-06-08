import React, { useEffect, useState } from 'react'
import { Image, ImageStyle, Modal, Pressable, ScrollView, TextInput, TouchableWithoutFeedback, View, ViewStyle } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { spacing } from '@/theme/spacing'
import { ThemedStyle } from '@/theme/types'
import { Switch } from '@/components/Toggle/Switch'
import Toast from 'react-native-toast-message'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { SignatureModal } from '@/components/common/SignatureModal'
import { useImagePicker } from '@/utils/useImagePicker'
import { Image as ImageIcon, PenLine, Trash2, ChevronRight, FileImage, CircleCheckBig } from 'lucide-react-native'
import {
    getAutoShareReceiptPreference,
    getReceiptFormatLabel,
    getReceiptFormatPreference,
    ReceiptFormatPreference,
    RECEIPT_FORMAT_OPTIONS,
    saveAutoShareReceiptPreference,
    saveReceiptFormatPreference,
} from '@/utils/receiptPreferences'
import { $styles } from '@/theme/styles'

const ReceiptSettingsScreen = () => {
    const { theme: { colors }, themed } = useAppTheme()
    const gymInfo = useAppSelector(selectGymInfo)
    const [footerNote, setFooterNote] = useState('Thank you for training with us!')
    const [showGymAddress, setShowGymAddress] = useState(true)
    const [signature, setSignature] = useState('')
    const [logo, setLogo] = useState('')
    const [receiptFormat, setReceiptFormat] = useState<ReceiptFormatPreference>(getReceiptFormatPreference())
    const [autoShareReceipt, setAutoShareReceipt] = useState(getAutoShareReceiptPreference())
    const [loading, setLoading] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [showSignatureModal, setShowSignatureModal] = useState(false)
    const [showFormatModal, setShowFormatModal] = useState(false)
    const { showImagePickerOptions, ImagePickerSheet } = useImagePicker()

    useEffect(() => {
        api.getSettings().then((res) => {
            if (res.kind === 'ok' && res.data?.receipt) {
                setFooterNote(res.data.receipt.footerNote || footerNote)
                setShowGymAddress(res.data.receipt.showGymAddress !== false)
                setSignature(res.data.receipt.signature || '')
                setLogo(res.data.receipt.logo || '')
            }
        })
    }, [])

    const handleSave = async () => {
        setLoading(true)
        const res = await api.updateReceiptSettings({ receipt: { footerNote, showGymAddress, signature, logo } })
        setLoading(false)
        if (res.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Receipt settings saved' })
            goBack()
        }
    }

    const handleLogoUpload = () => {
        showImagePickerOptions(async (uri) => {
            setUploadingLogo(true)
            const res = await api.uploadReceiptAsset(uri, 'logo')
            setUploadingLogo(false)
            if (res.kind === 'ok') setLogo(res.data?.url)
        })
    }

    const handleReceiptFormatSelect = (value: ReceiptFormatPreference) => {
        setReceiptFormat(value)
        saveReceiptFormatPreference(value)
        setShowFormatModal(false)
    }

    const handleAutoShareToggle = (value: boolean) => {
        setAutoShareReceipt(value)
        saveAutoShareReceiptPreference(value)
    }

    return (
        <Screen preset="fixed" safeAreaEdges={["bottom"]} contentContainerStyle={[$styles.flex1]}>
            <Header title="Receipt Settings" leftIcon="caretLeft" onLeftPress={goBack} safeAreaTop backgroundColor={colors.surface} />
            <SignatureModal visible={showSignatureModal} onClose={() => setShowSignatureModal(false)} onSaved={setSignature} />
            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
                    <SectionCard title="Share Behavior" subtitle="Choose the default share format and whether receipts open automatically.">
                        <Pressable style={themed($row)} onPress={() => setShowFormatModal(true)}>
                            <View style={themed($rowLeft)}>
                                <View style={themed($rowIcon)}>
                                    <FileImage size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text weight="medium">Default Share Format</Text>
                                    <Text size="xs" style={{ color: colors.textDim }}>{getReceiptFormatLabel(receiptFormat)}</Text>
                                </View>
                            </View>
                            <ChevronRight size={18} color={colors.textDim} />
                        </Pressable>
                        <View style={themed($toggleRow)}>
                            <View style={{ flex: 1, paddingRight: spacing.md }}>
                                <Text weight="medium">Auto-share Receipt</Text>
                                <Text size="xs" style={{ color: colors.textDim }}>Open receipt automatically after onboarding or renewal</Text>
                            </View>
                            <Switch value={autoShareReceipt} onValueChange={handleAutoShareToggle} />
                        </View>
                    </SectionCard>

                    <SectionCard title="Branding" subtitle="Use your gym logo by default, then add a custom receipt logo or signature only when needed.">
                        <View style={themed($assetRow)}>
                            <View style={themed($assetPreview)}>
                                {logo || gymInfo?.logo ? (
                                    <Image source={{ uri: logo || gymInfo?.logo }} style={$logoImage} resizeMode="cover" />
                                ) : (
                                    <View style={themed($emptyPreview)}>
                                        <ImageIcon size={26} color={colors.textDim} />
                                    </View>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text weight="medium">Receipt Logo</Text>
                                <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>
                                    Defaults to the gym logo.
                                </Text>
                                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                                    <Button title={uploadingLogo ? 'Uploading...' : 'Upload'} variant="outline" style={{ flex: 1, backgroundColor: colors.background }} onPress={handleLogoUpload} disabled={uploadingLogo} />
                                    {logo ? <Button title="Reset" variant="ghost" style={{ flex: 1 }} onPress={() => setLogo('')} /> : null}
                                </View>
                            </View>
                        </View>

                        <View style={themed($divider)} />

                        <View style={themed($signatureArea)}>
                            <View style={{ flex: 1 }}>
                                <Text weight="medium">Signature</Text>
                                <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>
                                    Add a handwritten signature for payment receipts.
                                </Text>
                            </View>
                            <View style={themed($signaturePreview)}>
                                {signature ? (
                                    <Image source={{ uri: signature }} style={{ width: '100%', height: 80 }} resizeMode="contain" />
                                ) : (
                                    <Text size="xs" style={{ color: colors.textDim }}>No signature</Text>
                                )}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                            <Button
                                title={signature ? 'Redraw' : 'Draw Signature'}
                                variant="outline"
                                icon={<PenLine size={18} color={colors.text} />}
                                style={{ flex: 1, backgroundColor: colors.background }}
                                onPress={() => setShowSignatureModal(true)}
                            />
                            {signature ? (
                                <Pressable style={themed($removeButton)} onPress={() => setSignature('')}>
                                    <Trash2 size={20} color={colors.error} />
                                </Pressable>
                            ) : null}
                        </View>
                    </SectionCard>

                    <SectionCard title="Receipt Content" subtitle="Edit the text and address shown on the receipt body.">
                        <Text weight="medium">Footer Note</Text>
                        <TextInput
                            value={footerNote}
                            onChangeText={setFooterNote}
                            style={themed($input)}
                            multiline
                            placeholder="Thank you for training with us!"
                            placeholderTextColor={colors.textDim}
                        />
                        <View style={themed($toggleRow)}>
                            <View style={{ flex: 1, paddingRight: spacing.md }}>
                                <Text weight="medium">Show gym address</Text>
                                <Text size="xs" style={{ color: colors.textDim }}>Include the gym address in the receipt footer</Text>
                            </View>
                            <Switch value={showGymAddress} onPress={() => setShowGymAddress(!showGymAddress)} />
                        </View>
                    </SectionCard>
                </ScrollView>
                <View style={themed($footer)}>
                    <Button title={loading ? 'Saving...' : 'Save Changes'} onPress={handleSave} style={{ marginTop: spacing.md }} disabled={loading} />
                </View>
            </View>
            <ImagePickerSheet />
            <Modal transparent visible={showFormatModal} animationType="fade" onRequestClose={() => setShowFormatModal(false)}>
                <TouchableWithoutFeedback onPress={() => setShowFormatModal(false)}>
                    <View style={themed($modalOverlay)}>
                        <TouchableWithoutFeedback>
                            <View style={themed($modalBox)}>
                                <Text preset="subheading" weight="bold" text="Receipt Format" />
                                {RECEIPT_FORMAT_OPTIONS.map((option) => (
                                    <Pressable key={option.value} style={themed($optionRow)} onPress={() => handleReceiptFormatSelect(option.value)}>
                                        <Text text={option.label} />
                                        {receiptFormat === option.value ? <View style={themed($selectedDot)} /> : null}
                                    </Pressable>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </Screen>
    )
}

export default ReceiptSettingsScreen

const $input: ThemedStyle<ViewStyle> = ({ colors }) => ({
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    marginTop: 4,
    minHeight: 88,
    textAlignVertical: 'top',
})

const $emptyPreview: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
})

const $removeButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    borderTopWidth: 1,
    padding: spacing.md,
    paddingTop: spacing.xxs,
    borderColor: colors.border,
})

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: 4,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
})

const $rowLeft: ThemedStyle<ViewStyle> = () => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
})

const $rowIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBackground,
})

const $toggleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
})

const $assetRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
})

const $assetPreview: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
})

const $logoImage: ImageStyle = { width: '100%', height: '100%' }

const $signatureArea: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    marginTop: spacing.md,
    gap: spacing.sm,
})

const $signaturePreview: ThemedStyle<ViewStyle> = ({ colors }) => ({
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
})

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
})

type SectionCardProps = { title: string; subtitle: string; children: React.ReactNode }

const SectionCard = ({ title, subtitle, children }: SectionCardProps) => {
    const { themed } = useAppTheme()
    return (
        <View style={themed($sectionCard)}>
            <Text preset="subheading" weight="bold" text={title} />
            <Text size="xs" style={{ color: useAppTheme().theme.colors.textDim, marginTop: 4, marginBottom: spacing.md }}>
                {subtitle}
            </Text>
            {children}
        </View>
    )
}

const $sectionCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
})

const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
})

const $modalBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
})

const $optionRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
})

const $selectedDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
})
