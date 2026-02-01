import { Pressable, StyleSheet, TextInput, View, ViewStyle } from 'react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import React, { FC } from 'react'
import { Text } from '@/components/Text'
import { $styles } from '@/theme/styles'
import { spacing } from '@/theme/spacing'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Switch } from '@/components/Toggle/Switch'
import { ClientOnBoardingType, MembershipRenewType } from '@/utils/types'

type Props = {
    handleForm: (field: string, value: any) => void,
    form: ClientOnBoardingType | MembershipRenewType,
    selectedMembership: { [key: string]: any }
}

const MembershipPayment: FC<Props> = ({ form, handleForm, selectedMembership }) => {
    const { theme: { colors }, themed } = useAppTheme();

    const getDurationLabel = () => {
        if (!selectedMembership) return '--'
        if (selectedMembership?.durationInMonths > 0) {
            const m = selectedMembership.durationInMonths
            return m === 1 ? 'month' : `${m} months`
        }
        else {
            const d = selectedMembership.durationInDays
            return d === 1 ? 'day' : `${d} days`
        }
    }

    return (
        <View style={{ marginTop: 15 }}>
            <Text preset='heading'>Payment Details</Text>
            <Text size='xs' style={{ color: colors.textDim }}>Select payment method to finalize enrollment.</Text>
            <View>
                <View style={[themed($card), { padding: spacing.md, marginVertical: spacing.md }]}>
                    <Text style={{ marginBottom: 5 }} size='md'>TOTAL PAYABLE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text size='xxl' weight='bold' style={{ marginRight: 5 }}>₹</Text>
                        <TextInput
                            keyboardType='number-pad'
                            value={form.amount?.toString()}
                            onChangeText={(val) => { handleForm('amount', Number(val)) }}
                            returnKeyType="done"
                            style={{ fontSize: 36, lineHeight: 44, fontWeight: 'bold', color: colors.text }}
                        />
                        <Text style={{ marginLeft: 5 }}>/ {getDurationLabel()}</Text>
                    </View>
                </View>
                <Text weight='medium'>Select Payment Method</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {['Cash', 'UPI', 'Card', 'Transfer'].map((type: string, index: number) => (
                        <Pressable key={index} style={[themed($card), { marginVertical: spacing.xs, width: '48%', alignItems: 'center', backgroundColor: form.method === type ? colors.surface : colors.surface, borderWidth: form.method === type ? 2 : 1, borderColor: form.method === type ? colors.tint : colors.border, padding: spacing.md }]} onPress={() => { handleForm('method', type) }}>
                            <MaterialCommunityIcons name={type === 'UPI' ? 'qrcode-scan' : type === 'Cash' ? 'cash-multiple' : type === 'Card' ? 'credit-card' : 'bank'} size={40} color={form.method === type ? colors.tint : colors.textDim} />
                            <Text style={{ marginTop: 5, color: form.method === type ? colors.tint : colors.textDim }}>{type}</Text>
                            {form.method === type && <Ionicons name='checkmark-circle' size={25} style={{ position: 'absolute', right: 10, top: 10 }} color={colors.tint} />}
                        </Pressable>
                    ))}
                </View>
                <View style={[themed($card), { padding: spacing.md, marginTop: spacing.md }, $styles.flexRow]}>
                    <View>
                        <Text weight='medium'>Payment Received</Text>
                        <Text size='xs' style={{ color: colors.textDim }}>Mark transaction as successful</Text>
                    </View>
                    <Switch value={form.paymentReceived} onPress={() => handleForm('paymentReceived', !form.paymentReceived)} />
                </View>
            </View>
        </View>
    )
}

export default MembershipPayment

const styles = StyleSheet.create({})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})