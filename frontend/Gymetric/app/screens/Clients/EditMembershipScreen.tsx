import React, { useEffect, useState } from 'react'
import { ScrollView, View, TextInput, ViewStyle } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { SelectField } from '@/components/SelectField'
import { spacing } from '@/theme/spacing'
import { ThemedStyle } from '@/theme/types'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { format } from 'date-fns'
import Toast from 'react-native-toast-message'
import { CustomModal } from '@/components/CustomModal'
import { $styles } from '@/theme/styles'
import { TextField } from '@/components/TextField'

const EditMembershipScreen = ({ route }: any) => {
    const { client, membership } = route.params
    const { theme: { colors }, themed } = useAppTheme()
    const [memberships, setMemberships] = useState<any[]>([])
    const [selectedPlan, setSelectedPlan] = useState<any[]>([])
    const [startDate, setStartDate] = useState(new Date(membership.startDate))
    const [endDate, setEndDate] = useState(new Date(membership.endDate))
    const [totalAmount, setTotalAmount] = useState(String(membership.totalAmount || 0))
    const [reason, setReason] = useState('')
    const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        api.allMemberships().then((res) => {
            if (res.kind === 'ok') {
                const opts = res.data.filter((m: any) => m.active).map((m: any) => ({ ...m, label: `${m.planName} - ₹${m.price}` }))
                setMemberships(opts)
                const current = opts.find((m: any) => m._id === membership.planId)
                if (current) setSelectedPlan([current])
            }
        })
    }, [])

    const handleSave = async () => {
        if (!reason.trim()) {
            Toast.show({ type: 'error', text1: 'Reason is required' })
            return
        }
        setLoading(true)
        const response = await api.amendMembership({
            clientId: client._id,
            membershipId: membership._id,
            planId: selectedPlan[0]?._id,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            totalAmount: Number(totalAmount),
            reason,
        })
        setLoading(false)
        if (response.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Membership updated' })
            goBack()
        }
    }

    return (
        <Screen preset="fixed">
            <Header title="Edit Membership" leftIcon="caretLeft" onLeftPress={goBack} safeAreaTop backgroundColor={colors.surface} />
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <SelectField
                    label="Plan"
                    value={selectedPlan}
                    onSelect={setSelectedPlan}
                    options={memberships}
                    multiple={false}
                    labelKey="label"
                    valueKey="_id"
                />
                <Text style={$styles.label}>Start Date</Text>
                <Button title={format(startDate, 'dd MMM yyyy')} variant="outline" onPress={() => setDatePicker('start')} style={{ marginBottom: spacing.md, backgroundColor: colors.surface }} />
                <Text style={$styles.label}>End Date</Text>
                <Button title={format(endDate, 'dd MMM yyyy')} variant="outline" onPress={() => setDatePicker('end')} style={{ marginBottom: spacing.md, backgroundColor: colors.surface }} />
                <TextField
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                    autoCapitalize="words"
                    autoCorrect={false}
                    keyboardType='number-pad'
                    label="Total Amount"
                    placeholder="Enter total amount"
                    returnKeyType="next"

                />

                <TextField
                    label='Reason (required)'
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    placeholder="Why is this being changed?"
                    returnKeyType="next"
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                    onSubmitEditing={() => setShowConfirm(true)}
                />
                <Button title="Save Changes" onPress={() => setShowConfirm(true)} style={{ marginTop: spacing.lg }} />
            </ScrollView>

            <DateTimePickerModal
                isVisible={!!datePicker}
                mode="date"
                date={datePicker === 'start' ? startDate : endDate}
                onConfirm={(d) => {
                    if (datePicker === 'start') setStartDate(d)
                    else setEndDate(d)
                    setDatePicker(null)
                }}
                onCancel={() => setDatePicker(null)}
            />

            <CustomModal
                visible={showConfirm}
                title="Confirm Update"
                message={`Update ${client.name}'s ${membership.planName} membership?`}
                confirmText={loading ? 'Saving...' : 'Confirm'}
                onConfirm={handleSave}
                onCancel={() => setShowConfirm(false)}
            />
        </Screen>
    )
}

export default EditMembershipScreen

const $input: ThemedStyle<ViewStyle> = ({ colors }) => ({
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    marginBottom: spacing.sm,
})