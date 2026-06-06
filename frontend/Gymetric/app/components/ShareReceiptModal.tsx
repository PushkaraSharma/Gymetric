import React, { useState } from 'react'
import { Modal, View, Pressable, TouchableWithoutFeedback, ViewStyle, ActivityIndicator } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { generatePaymentReceiptHTML } from '@/utils/paymentReceiptTemplate'
import { format } from 'date-fns'
import Toast from 'react-native-toast-message'

type Props = {
    visible: boolean
    onClose: () => void
    gym: any
    client: any
    payment: any
    membership?: any
    receiptConfig?: any
}

const ShareReceiptModal = ({ visible, onClose, gym, client, payment, membership, receiptConfig }: Props) => {
    const { themed, theme: { colors } } = useAppTheme()
    const [loading, setLoading] = useState(false)

    const buildHtml = () => {
        const balance = client?.balance || 0
        const isPartial = balance > 0 || payment?.remarks?.includes('Partial')
        return generatePaymentReceiptHTML({
            gym: { name: gym?.name || 'Gym', address: gym?.address, logo: receiptConfig?.logo || gym?.logo },
            client: { name: client?.name, phoneNumber: client?.phoneNumber },
            payment: {
                amount: payment?.amount,
                method: payment?.method,
                date: format(new Date(payment?.date || new Date()), 'dd MMM yyyy'),
                remarks: payment?.remarks,
            },
            membership: membership ? {
                planName: membership.planName,
                startDate: membership.startDate ? format(new Date(membership.startDate), 'dd MMM yyyy') : undefined,
                endDate: membership.endDate ? format(new Date(membership.endDate), 'dd MMM yyyy') : undefined,
            } : undefined,
            balance,
            receiptNo: `GK-${Date.now().toString().slice(-8)}`,
            receiptConfig,
            status: isPartial ? 'PARTIAL' : 'PAID',
        })
    }

    const sharePdf = async () => {
        setLoading(true)
        try {
            const { uri } = await Print.printToFileAsync({ html: buildHtml() })
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Receipt' })
            }
            onClose()
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to generate receipt' })
        }
        setLoading(false)
    }

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={themed($overlay)}>
                    <TouchableWithoutFeedback>
                        <View style={themed($box)}>
                            <Text preset="subheading" weight="bold">Share Receipt</Text>
                            <Text size="xs" style={{ color: colors.textDim, marginVertical: spacing.sm }}>
                                Payment of ₹{payment?.amount} recorded successfully
                            </Text>
                            {loading ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                <>
                                    <Button title="Share as PDF" onPress={sharePdf} style={{ marginBottom: spacing.sm }} />
                                    <Button title="Skip" variant="outline" onPress={onClose} />
                                </>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    )
}

export default ShareReceiptModal

const $overlay: ThemedStyle<ViewStyle> = () => ({
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
})

const $box: ThemedStyle<ViewStyle> = ({ colors, spacing: sp }) => ({
    backgroundColor: colors.background, borderRadius: 20, padding: sp.lg, width: '100%', maxWidth: 340,
})
