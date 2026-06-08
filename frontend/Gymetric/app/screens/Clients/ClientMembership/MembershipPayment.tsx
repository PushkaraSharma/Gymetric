import { Pressable, TextInput, View, ViewStyle } from 'react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import React, { FC, useEffect } from 'react'
import { Text } from '@/components/Text'
import { spacing } from '@/theme/spacing'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ClientOnBoardingType, MembershipRenewType } from '@/utils/types'
import { ClientSectionLabel } from '@/components/clients/ClientSectionLabel'
import { Check, Wallet, AlertCircle } from 'lucide-react-native'
import { formatDate } from 'date-fns'

type Props = {
    handleForm: (field: string, value: any) => void,
    form: ClientOnBoardingType | MembershipRenewType,
    selectedMembership: { [key: string]: any }
}

const METHODS = [
    { id: 'Cash', icon: 'cash-multiple' as const },
    { id: 'UPI', icon: 'qrcode-scan' as const },
    { id: 'Card', icon: 'credit-card' as const },
    { id: 'Transfer', icon: 'bank' as const },
]

const MembershipPayment: FC<Props> = ({ form, handleForm, selectedMembership }) => {
    const { theme: { colors }, themed } = useAppTheme()

    useEffect(() => {
        if (form.amount > 0 && form.amountReceived === undefined) {
            handleForm('amountReceived', form.amount)
        }
    }, [form.amount])

    const getDurationLabel = () => {
        if (!selectedMembership) return '—'
        if (selectedMembership?.durationInMonths > 0) {
            const m = selectedMembership.durationInMonths
            return m === 1 ? '1 month' : `${m} months`
        }
        const d = selectedMembership.durationInDays
        return d === 1 ? '1 day' : `${d} days`
    }

    const balanceDue = Math.max(0, (form.amount || 0) - (form.amountReceived || 0))
    const startLabel = 'startDate' in form && form.startDate ? formatDate(form.startDate, 'dd MMM yyyy') : null

    return (
        <View>
            <ClientSectionLabel title="Order Summary" subtitle="Review before completing" />

            <View style={themed($summaryCard)}>
                <View style={themed($summaryRow)}>
                    <Text size="sm" style={{ color: colors.textDim }}>Plan</Text>
                    <Text weight="semiBold" size="sm">{selectedMembership?.planName || '—'}</Text>
                </View>
                <View style={themed($summaryRow)}>
                    <Text size="sm" style={{ color: colors.textDim }}>Duration</Text>
                    <Text weight="medium" size="sm">{getDurationLabel()}</Text>
                </View>
                {startLabel && (
                    <View style={themed($summaryRow)}>
                        <Text size="sm" style={{ color: colors.textDim }}>Starts</Text>
                        <Text weight="medium" size="sm">{startLabel}</Text>
                    </View>
                )}
                <View style={[themed($summaryRow), { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs }]}>
                    <Text weight="semiBold">Total</Text>
                    <Text weight="bold" size="lg">₹{form.amount || 0}</Text>
                </View>
            </View>

            <ClientSectionLabel title="Amount" subtitle="Total payable and amount received now" />

            <View style={themed($amountCard)}>
                <Text size="xs" style={{ color: colors.textDim, marginBottom: 6 }}>TOTAL PAYABLE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text size="xxl" weight="bold" style={{ marginRight: 4 }}>₹</Text>
                    <TextInput
                        keyboardType="number-pad"
                        value={form.amount?.toString()}
                        onChangeText={(val) => {
                            const num = Number(val) || 0
                            handleForm('amount', num)
                            if ((form.amountReceived || 0) > num) handleForm('amountReceived', num)
                        }}
                        returnKeyType="done"
                        style={{ fontSize: 32, fontWeight: '700', color: colors.text, flex: 1 }}
                    />
                </View>
            </View>

            <View style={themed($amountCard)}>
                <Text size="xs" style={{ color: colors.textDim, marginBottom: 6 }}>AMOUNT RECEIVED NOW</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text size="xl" weight="bold" style={{ marginRight: 4 }}>₹</Text>
                    <TextInput
                        keyboardType="number-pad"
                        value={(form.amountReceived ?? form.amount)?.toString()}
                        onChangeText={(val) => handleForm('amountReceived', Number(val) || 0)}
                        returnKeyType="done"
                        style={{ fontSize: 26, fontWeight: '700', color: colors.text, flex: 1 }}
                    />
                </View>
                {balanceDue > 0 ? (
                    <View style={[themed($hint), { backgroundColor: colors.errorBackground }]}>
                        <AlertCircle size={14} color={colors.error} />
                        <Text size="xs" style={{ color: colors.error, marginLeft: 6, flex: 1 }}>
                            ₹{balanceDue} will be added to member's balance
                        </Text>
                    </View>
                ) : (form.amountReceived || 0) > 0 ? (
                    <View style={[themed($hint), { backgroundColor: colors.successBackground }]}>
                        <Check size={14} color={colors.success} />
                        <Text size="xs" style={{ color: colors.success, marginLeft: 6 }}>Full payment — no balance due</Text>
                    </View>
                ) : null}
            </View>

            <ClientSectionLabel title="Payment Method" />

            <View style={themed($methodGrid)}>
                {METHODS.map(({ id, icon }) => {
                    const selected = form.method === id
                    return (
                        <Pressable
                            key={id}
                            style={[themed($methodChip), selected && { borderColor: colors.primary, backgroundColor: colors.primaryBackground }]}
                            onPress={() => handleForm('method', id)}
                        >
                            <MaterialCommunityIcons name={icon} size={28} color={selected ? colors.primary : colors.textDim} />
                            <Text size="xs" weight={selected ? 'semiBold' : 'normal'} style={{ marginTop: 6, color: selected ? colors.primary : colors.textDim }}>{id}</Text>
                            {selected && (
                                <View style={[themed($methodCheck), { backgroundColor: colors.primary }]}>
                                    <Check size={10} color={colors.background} />
                                </View>
                            )}
                        </Pressable>
                    )
                })}
            </View>

            <View style={[themed($footerNote), { marginBottom: spacing.xl }]}>
                <Wallet size={16} color={colors.textDim} />
                <Text size="xxs" style={{ color: colors.textDim, marginLeft: 8, flex: 1 }}>
                    Payment is recorded immediately. You can share a receipt after onboarding.
                </Text>
            </View>
        </View>
    )
}

export default MembershipPayment

const $summaryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
})

const $summaryRow: ThemedStyle<ViewStyle> = () => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
})

const $amountCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
})

const $hint: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
})

const $methodGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
})

const $methodChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    width: '47%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    position: 'relative',
})

const $methodCheck: ThemedStyle<ViewStyle> = () => ({
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
})

const $footerNote: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
})
