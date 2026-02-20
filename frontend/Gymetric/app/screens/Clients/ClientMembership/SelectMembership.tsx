import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import React, { FC, useState } from 'react'
import { Text } from '@/components/Text';
import { SelectField } from '@/components/SelectField';
import { spacing } from '@/theme/spacing';
import { $styles } from '@/theme/styles';
import { useAppTheme } from '@/theme/context';
import { ThemedStyle } from '@/theme/types';
import { Entypo, Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { formatDate } from 'date-fns';
import { ClientOnBoardingType } from '@/utils/types';
import DependentCard from './DependentCard';
import { alreadyExists } from '@/utils/Helper';

type Props = {
    memberships: { [key: string]: any }[],
    selectedMembership: { [key: string]: any }[],
    setSelectedMembership: (val: { [key: string]: any }[]) => void,
    handleForm: (field: string, value: any) => void,
    handleDatePicker: () => void,
    form: ClientOnBoardingType,
    setForm: (val: ClientOnBoardingType) => void,
    duplicateNo: string,
    setDuplicateNo: (val: string) => void
}

const SelectMembership: FC<Props> = ({ selectedMembership, setSelectedMembership, memberships, handleDatePicker, handleForm, form, setForm, duplicateNo, setDuplicateNo }) => {
    const { theme: { colors }, themed } = useAppTheme();

    const addMember = () => {
        // @ts-ignore
        setForm(prev => ({ ...prev, dependents: [...prev.dependents, { name: '', phoneNumber: '', gender: 'Male' }] }));
    };

    const updateDependent = (index: number, field: string, value: string) => {
        // @ts-ignore
        setForm(prev => {
            if (!prev.dependents) return prev;
            const updatedDependents = [...prev.dependents];
            updatedDependents[index] = { ...updatedDependents[index], [field]: value };
            return { ...prev, dependents: updatedDependents };
        });
        if (field === 'phoneNumber' && value.length === 10 && (value === form.primaryDetails.phoneNumber || alreadyExists(value))) {
            setDuplicateNo(index.toString());
        } else {
            setDuplicateNo('');
        }
    };

    const updateExistingDependent = (index: number, action: 'add' | 'delete', item?: any) => {
        // @ts-ignore
        setForm(prev => {
            const updatedDependents = [...prev.dependents];
            if (action === 'delete') {
                updatedDependents.splice(index, 1);
            } else if (item) {
                updatedDependents[index] = { clientId: item._id, name: item.name, phoneNumber: item?.phoneNumber, gender: item.gender };
            }
            return { ...prev, dependents: updatedDependents };
        })
    };

    return (
        <View style={{ marginTop: 15 }}>
            <Text preset='heading'>Select Membership</Text>
            <View style={{ marginTop: 20 }}>
                <View>
                    <SelectField
                        label="Membership Tier"
                        placeholder="Select membership"
                        value={selectedMembership}
                        onSelect={(val) => { setSelectedMembership(val); handleForm('amount', val?.[0]?.price ?? 0); handleForm('dependents', []) }}
                        options={memberships}
                        multiple={false}
                        allowEmpty={false}
                        labelKey={'label'}
                        valueKey={"_id"}
                        containerStyle={{ marginBottom: spacing.lg }}
                    />
                    {
                        selectedMembership?.[0]?.planType === 'indivisual' ?
                            <View style={[themed($card), { padding: 0 }]}>
                                <View style={themed($cardHeader)}>
                                    <View style={themed({ backgroundColor: colors.palette.indigo100, padding: 8, borderRadius: 20 })}>
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
                            </View> :
                            <View>
                                <View style={[$styles.flexRow, { marginBottom: 10 }]}>
                                    <Text preset='subheading'>Group Members</Text>
                                    <Text size='xxs' weight='medium' style={themed($slotText)}>{form.dependents.length + 1}/{selectedMembership?.[0]?.membersAllowed} Slots Filled</Text>
                                </View>
                                <View style={{ marginBottom: 10 }}>
                                    <Text size='xs' style={{ color: colors.textDim }}>Primary Payer</Text>
                                    <View style={[themed($card), $styles.flexRow, { padding: spacing.sm, marginVertical: spacing.xs }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '85%' }}>
                                            <View style={{ padding: 10, borderRadius: 20, backgroundColor: colors.palette.indigo100, marginRight: 15 }}>
                                                <Octicons name='person' size={20} color={colors.tint} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text preset={'formLabel'}>{form?.primaryDetails?.name}</Text>
                                                <Text size='xs' style={{ color: colors.textDim }} numberOfLines={1}>Main Account Holder ({form.primaryDetails?.gender})</Text>
                                            </View>
                                        </View>
                                        <Entypo name='lock' size={20} color={colors.tintInactive} />
                                    </View>
                                </View>
                                <View style={{ marginBottom: 15 }}>
                                    <Text size='xs' style={{ color: colors.textDim, marginBottom: 10 }}>Dependents</Text>
                                    {
                                        form.dependents?.map((dependent, index) => <DependentCard key={index} item={dependent} index={index} updateDependent={updateDependent} duplicateNo={duplicateNo} updateExistingDependent={updateExistingDependent} />)
                                    }
                                    {form.dependents.length < selectedMembership?.[0]?.membersAllowed - 1 &&
                                        <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 5, borderStyle: 'dashed', borderColor: colors.textDim, padding: 10 }} onPress={addMember}>
                                            <Ionicons name='add-circle' size={25} color={colors.textDim} />
                                            <Text style={{ color: colors.textDim, marginLeft: 5 }} weight='medium'>Add Dependent {form.dependents.length + 1}</Text>
                                        </Pressable>}
                                </View>
                            </View>
                    }

                    <View style={[$styles.flexRow, { marginBottom: 15, marginTop: 10 }]}>
                        <Text weight='medium'>Start Date</Text>
                        <Pressable style={themed($dateView)} onPress={handleDatePicker}>
                            <Text style={{ color: form.startDate ? colors.text : colors.textDim }}>{form.startDate ? formatDate(form.startDate, 'dd/MM/yyyy') : 'dd/mm/yyyy'}</Text>
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

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
})

const $cardHeader: ThemedStyle<ViewStyle> = ({ spacing, colors, isDark }) => ({
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: isDark ? colors.palette.slate800 : colors.palette.slate300,
    borderTopEndRadius: 12,
    borderTopStartRadius: 12,
})

const $membershipItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    ...$styles.flexRow,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xs
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})

const $dateView: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    flexDirection: 'row',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    width: '60%',
})

const $slotText: ThemedStyle<ViewStyle> = ({ spacing, colors, isDark }) => ({ borderRadius: 10, backgroundColor: isDark ? colors.palette.slate800 : colors.palette.indigo100, color: colors.tint, paddingHorizontal: 5, paddingVertical: 2 })
