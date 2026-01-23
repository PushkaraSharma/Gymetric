import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import React, { FC } from 'react'
import { Text } from '@/components/Text'
import { $styles } from '@/theme/styles'
import { spacing } from '@/theme/spacing'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { colors } from '@/theme/colors'
import { Switch } from '@/components/Toggle/Switch'
import { ClientOnBoardingType, MembershipRenewType } from '@/utils/types'

type Props = {
    handleForm: (field: string, value: any) => void,
    form: ClientOnBoardingType | MembershipRenewType,
    selectedMembership: { [key: string]: any }
}

const MembershipPayment: FC<Props> = ({ form, handleForm, selectedMembership }) => {

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
            <Text weight='light'>Select payment method to finalize enrollment.</Text>
            <View>
                <View style={[$styles.card, { padding: spacing.md }]}>
                    <Text style={{ marginBottom: 5 }} size='md'>TOTAL PAYABLE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text size='xxl' weight='bold' style={{ marginRight: 5 }}>₹</Text>
                        <TextInput
                            keyboardType='number-pad'
                            value={form.amount?.toString()}
                            onChangeText={(val) => { handleForm('amount', Number(val)) }}
                            style={{ fontSize: 36, lineHeight: 44, fontWeight: 'bold' }}
                        />
                        <Text style={{ marginLeft: 5 }}>/ {getDurationLabel()}</Text>
                    </View>
                </View>
                <Text>Select Payment Method</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {['Cash', 'UPI', 'Card', 'Transfer'].map((type: string, index: number) => (
                        <Pressable key={index} style={[$styles.card, { marginVertical: spacing.xs, width: '48%', alignItems: 'center', backgroundColor: form.method === type ? colors.palette.primary100 : colors.palette.neutral250, borderWidth: form.method === type ? 2 : 0, borderColor: colors.tint, padding: spacing.md }]} onPress={() => { handleForm('method', type) }}>
                            <MaterialCommunityIcons name={type === 'UPI' ? 'qrcode-scan' : type === 'Cash' ? 'cash-multiple' : type === 'Card' ? 'credit-card' : 'bank'} size={40} color={form.method === type ? colors.tint : colors.textDim} />
                            <Text style={{ marginTop: 5, color: form.method === type ? colors.tint : colors.textDim }}>{type}</Text>
                            {form.method === type && <Ionicons name='checkmark-circle' size={25} style={{ position: 'absolute', right: 10, top: 10 }} color={colors.tint} />}
                        </Pressable>
                    ))}
                </View>
                <View style={[$styles.card, { padding: spacing.md }, $styles.flexRow]}>
                    <View>
                        <Text preset='subheading'>Payment Received</Text>
                        <Text size='xs'>Mark transaction as successful</Text>
                    </View>
                    <Switch value={form.paymentReceived} onPress={() => handleForm('paymentReceived', !form.paymentReceived)} />
                </View>
            </View>
        </View>
    )
}

export default MembershipPayment

const styles = StyleSheet.create({})