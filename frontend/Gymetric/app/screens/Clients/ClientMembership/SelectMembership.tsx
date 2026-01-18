import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import React, { FC } from 'react'
import { Text } from '@/components/Text';
import { SelectField } from '@/components/SelectField';
import { spacing } from '@/theme/spacing';
import { $styles } from '@/theme/styles';
import { useAppTheme } from '@/theme/context';
import { colors } from '@/theme/colors';
import { ThemedStyle } from '@/theme/types';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { formatDate } from 'date-fns';
import { ClientFormType, MembershipRenewType } from '@/utils/types';

type Props = {
    memberships: { [key: string]: any }[],
    selectedMembership: { [key: string]: any }[],
    setSelectedMembership: (val: { [key: string]: any }[]) => void,
    handleForm: (field: string, value: any) => void,
    handleDatePicker: () => void,
    form: ClientFormType | MembershipRenewType
}

const SelectMembership: FC<Props> = ({ selectedMembership, setSelectedMembership, memberships, handleDatePicker, handleForm, form }) => {
    const { themed } = useAppTheme();

    return (
        <View style={{ marginTop: 15 }}>
            <Text preset='heading'>Select Membership</Text>
            <View style={{ marginTop: 20 }}>
                <View>
                    <SelectField
                        label="Membership Tier"
                        placeholder="Select membership"
                        value={selectedMembership}
                        onSelect={(val) => { setSelectedMembership(val); handleForm('amount', val?.[0]?.price ?? 0) }}
                        options={memberships}
                        multiple={false}
                        labelKey={'label'}
                        valueKey={"_id"}
                        containerStyle={{ marginBottom: spacing.lg }}
                    />
                    <View style={[$styles.card, { padding: 0 }]}>
                        <View style={themed($cardHeader)}>
                            <View style={themed({ backgroundColor: colors.palette.primary100, padding: 8, borderRadius: 20 })}>
                                <MaterialIcons name='card-membership' size={25} color={colors.tint} />
                            </View>
                            <View style={{ marginLeft: 15 }}>
                                <Text weight='medium' size='md'>{selectedMembership?.[0]?.planName}</Text>
                                <View style={themed({ padding: 2, marginTop: 5, paddingHorizontal: 5, backgroundColor: colors.activeBg, borderWidth: 0.5, borderColor: colors.activeTxt, borderRadius: 5, alignSelf: 'flex-start' })}>
                                    <Text size='xxs' style={themed({ color: colors.activeTxt })}>Active Selection</Text>
                                </View>
                            </View>
                        </View>
                        <View style={[{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
                            <View style={themed($membershipItem)}>
                                <Text>Price</Text>
                                <Text>{selectedMembership?.[0]?.price}</Text>
                            </View>
                            <View style={themed($membershipItem)}>
                                <Text>Billing</Text>
                                <Text>Recurring Monthly</Text>
                            </View>
                            <View style={[themed($membershipItem), { borderBottomWidth: 0 }]}>
                                <Text>Guests Allowed</Text>
                                <Text>1 per month</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[$styles.flexRow, { marginBottom: 15 }]}>
                        <Text weight='medium'>Start Date</Text>
                        <Pressable style={{ width: '60%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.palette.neutral400, borderRadius: 5, backgroundColor: colors.palette.neutral100 }} onPress={handleDatePicker}>
                            <Text style={{ color: form.startDate ? '#000' : colors.textDim }}>{form.startDate ? formatDate(form.startDate, 'dd/MM/yyyy') : 'dd/mm/yyyy'}</Text>
                            <Ionicons name='calendar-outline' size={20} color={colors.textDim} />
                        </Pressable>
                    </View>
                    <Text size='xs' style={themed({ color: colors.textDim, textAlign: 'center' })}>Prices may vary based on promotional codes applied at the final step.</Text>
                </View>
            </View>
        </View>
    )
}

export default SelectMembership

const styles = StyleSheet.create({})

const $cardHeader: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.palette.neutral250,
    borderTopEndRadius: 5,
    borderTopStartRadius: 5,
})

const $membershipItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    ...$styles.flexRow,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xs
})