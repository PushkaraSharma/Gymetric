import React, { useEffect, useState } from 'react'
import { ScrollView, TextInput, View, ViewStyle } from 'react-native'
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

const ReceiptSettingsScreen = () => {
    const { theme: { colors }, themed } = useAppTheme()
    const [footerNote, setFooterNote] = useState('Thank you for training with us!')
    const [showGymAddress, setShowGymAddress] = useState(true)
    const [signature, setSignature] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        api.getSettings().then((res) => {
            if (res.kind === 'ok' && res.data?.receipt) {
                setFooterNote(res.data.receipt.footerNote || footerNote)
                setShowGymAddress(res.data.receipt.showGymAddress !== false)
                setSignature(res.data.receipt.signature || '')
            }
        })
    }, [])

    const handleSave = async () => {
        setLoading(true)
        const res = await api.updateReceiptSettings({ receipt: { footerNote, showGymAddress, signature } })
        setLoading(false)
        if (res.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Receipt settings saved' })
            goBack()
        }
    }

    return (
        <Screen preset="fixed">
            <Header title="Receipt Settings" leftIcon="caretLeft" onLeftPress={goBack} safeAreaTop backgroundColor={colors.surface} />
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.md }}>
                    Configure how payment receipts appear when shared with clients.
                </Text>
                <Text weight="medium">Footer Note</Text>
                <TextInput value={footerNote} onChangeText={setFooterNote} style={themed($input)} multiline />
                <Text weight="medium" style={{ marginTop: spacing.md }}>Signature URL (optional)</Text>
                <TextInput value={signature} onChangeText={setSignature} placeholder="Cloudinary image URL" placeholderTextColor={colors.textDim} style={themed($input)} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }}>
                    <Text weight="medium">Show gym address</Text>
                    <Switch value={showGymAddress} onPress={() => setShowGymAddress(!showGymAddress)} />
                </View>
                <Button title={loading ? 'Saving...' : 'Save'} onPress={handleSave} style={{ marginTop: spacing.xl }} disabled={loading} />
            </ScrollView>
        </Screen>
    )
}

export default ReceiptSettingsScreen

const $input: ThemedStyle<ViewStyle> = ({ colors }) => ({
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, marginTop: 4, marginBottom: spacing.sm,
})
