import React, { useState } from 'react'
import { View, TextInput, Pressable, Modal, TouchableWithoutFeedback, ViewStyle, Keyboard } from 'react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { spacing } from '@/theme/spacing'
import { ThemedStyle } from '@/theme/types'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '@/services/Api'
import Toast from 'react-native-toast-message'
import ShareReceiptModal from '@/components/ShareReceiptModal'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import ToastApp from '@/components/common/ToastApp'

type Props = {
    visible: boolean
    onClose: () => void
    client: any
    onSuccess: () => void
}

const CollectPaymentModal = ({ visible, onClose, client, onSuccess }: Props) => {
    const { theme: { colors }, themed } = useAppTheme()
    const gymInfo = useAppSelector(selectGymInfo)
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('Cash')
    const [remarks, setRemarks] = useState('')
    const [loading, setLoading] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [lastPayment, setLastPayment] = useState<any>(null)
    const [updatedClient, setUpdatedClient] = useState<any>(null)

    const handleCollect = async () => {
        const num = Number(amount)
        if (!num || num <= 0) {
            Toast.show({ type: 'error', text1: 'Enter a valid amount' })
            return
        }
        if (num > (client?.balance || 0)) {
            Toast.show({ type: 'error', text1: 'Amount exceeds balance' })
            return
        }
        setLoading(true)
        const response = await api.collectPayment({
            clientId: client._id,
            amount: num,
            method,
            remarks: remarks || undefined,
        })
        setLoading(false)
        if (response.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Payment collected' })
            setLastPayment({ amount: num, method, date: new Date(), remarks: remarks || 'Balance collection' })
            setUpdatedClient(response.data)
            setAmount('')
            setRemarks('')
            onSuccess()
            onClose()
            setShowReceipt(true)
        }
    }

    return (
        <>
            <ShareReceiptModal
                visible={showReceipt}
                onClose={() => setShowReceipt(false)}
                gym={gymInfo}
                client={updatedClient || client}
                payment={lastPayment}
                receiptConfig={{}}
            />
            <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={themed($overlay)}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={themed($container)}>
                                <Text preset="subheading" weight="bold">Collect Payment</Text>
                                <Text style={{ color: colors.textDim, marginVertical: spacing.xs }}>
                                    Outstanding: ₹{client?.balance || 0}
                                </Text>
                                <TextInput
                                    placeholder="Amount"
                                    keyboardType="number-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 16, color: colors.text }}
                                    placeholderTextColor={colors.textDim}
                                />
                                <TextInput
                                    placeholder="Remarks (optional)"
                                    value={remarks}
                                    onChangeText={setRemarks}
                                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 16, color: colors.text }}
                                    placeholderTextColor={colors.textDim}
                                />
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg, marginTop: spacing.sm }}>
                                    {['Cash', 'UPI', 'Card', 'Transfer'].map((type) => (
                                        <Pressable
                                            key={type}
                                            onPress={() => setMethod(type)}
                                            style={[themed($chip), method === type && { borderColor: colors.tint, borderWidth: 2 }]}
                                        >
                                            <MaterialCommunityIcons name={type === 'UPI' ? 'qrcode-scan' : type === 'Cash' ? 'cash-multiple' : type === 'Card' ? 'credit-card' : 'bank'} size={16} color={method === type ? colors.tint : colors.textDim} />
                                            <Text size="xs" style={{ marginLeft: 4, color: method === type ? colors.tint : colors.textDim }}>{type}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={onClose} />
                                    <Button title={loading ? 'Collecting...' : 'Collect'} style={{ flex: 1 }} onPress={handleCollect} disabled={loading} />
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
                <ToastApp />
            </Modal>
        </>
    )
}

export default CollectPaymentModal

const $overlay: ThemedStyle<ViewStyle> = () => ({
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
})

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
})
