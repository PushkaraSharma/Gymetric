import { Pressable, View, ViewStyle } from 'react-native'
import React, { FC, Dispatch, SetStateAction, useRef, useCallback } from 'react'
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/Text'
import { spacing } from '@/theme/spacing'
import { $styles } from '@/theme/styles'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Entypo, Ionicons, Octicons } from '@expo/vector-icons'
import { formatDate } from 'date-fns'
import { ClientOnBoardingType } from '@/utils/types'
import DependentCard from './DependentCard'
import { alreadyExists } from '@/utils/Helper'
import { ClientSectionLabel } from '@/components/clients/ClientSectionLabel'
import { Calendar, Users, Check } from 'lucide-react-native'

type Props = {
    memberships: { [key: string]: any }[],
    selectedMembership: { [key: string]: any }[],
    setSelectedMembership: (val: { [key: string]: any }[]) => void,
    handleForm: (field: string, value: any) => void,
    handleDatePicker: () => void,
    form: ClientOnBoardingType,
    setForm: Dispatch<SetStateAction<ClientOnBoardingType>>,
    duplicateNo: string,
    setDuplicateNo: (val: string) => void
}

const getDuration = (plan: any) => {
    if (plan.durationInMonths > 0) return plan.durationInMonths === 1 ? '1 month' : `${plan.durationInMonths} months`
    return plan.durationInDays === 1 ? '1 day' : `${plan.durationInDays} days`
}

const SelectMembership: FC<Props> = ({
    selectedMembership, setSelectedMembership, memberships, handleDatePicker, handleForm, form, setForm, duplicateNo, setDuplicateNo
}) => {
    const { theme: { colors }, themed } = useAppTheme()
    const selected = selectedMembership?.[0]
    const bottomSheetModalRef = useRef<BottomSheetModal>(null)
    const { bottom } = useSafeAreaInsets()

    const openPlanSelector = () => {
        bottomSheetModalRef.current?.present()
    }

    const selectPlan = (plan: any) => {
        setSelectedMembership([plan])
        handleForm('amount', plan.price)
        handleForm('amountReceived', plan.price)
        handleForm('dependents', [])
        bottomSheetModalRef.current?.dismiss()
    }

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="close"
            />
        ),
        []
    )

    const addMember = () => {
        setForm(prev => ({ ...prev, dependents: [...prev.dependents, { name: '', phoneNumber: '', gender: 'Male' }] }))
    }

    const updateDependent = (index: number, field: string, value: string) => {
        setForm(prev => {
            const updatedDependents = [...prev.dependents]
            updatedDependents[index] = { ...updatedDependents[index], [field]: value }
            return { ...prev, dependents: updatedDependents }
        })
        if (field === 'phoneNumber' && value.length === 10 && (value === form.primaryDetails.phoneNumber || alreadyExists(value))) {
            setDuplicateNo(index.toString())
        } else setDuplicateNo('')
    }

    const updateExistingDependent = (index: number, action: 'add' | 'delete', item?: any) => {
        setForm(prev => {
            const updatedDependents = [...prev.dependents]
            if (action === 'delete') updatedDependents.splice(index, 1)
            else if (item) updatedDependents[index] = { clientId: item._id, name: item.name, phoneNumber: item?.phoneNumber, gender: item.gender } as any
            return { ...prev, dependents: updatedDependents }
        })
    }



    return (
        <View>
            <ClientSectionLabel title="Choose Plan" subtitle="Select a membership tier" />

            <Pressable
                onPress={openPlanSelector}
                style={themed($pickerCard)}
            >
                <View style={{ flex: 1 }}>
                    <Text size="xxs" style={{ color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Plan Tier
                    </Text>
                    {selected ? (
                        <>
                            <Text weight="bold" size="md" style={{ marginTop: 4, color: colors.text }}>
                                {selected.planName}
                            </Text>
                            <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>
                                {getDuration(selected)} · {selected.planType}
                            </Text>
                        </>
                    ) : (
                        <Text weight="medium" size="md" style={{ marginTop: 4, color: colors.textDim }}>
                            Choose a plan...
                        </Text>
                    )}
                </View>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
                    {selected && (
                        <Text weight="bold" size="lg" style={{ color: colors.primary }}>
                            ₹{selected.price}
                        </Text>
                    )}
                    <Ionicons name="chevron-down" size={20} color={colors.textDim} />
                </View>
            </Pressable>

            {/* Bottom Sheet Modal for selecting plan */}
            <BottomSheetModal
                ref={bottomSheetModalRef}
                snapPoints={["60%", "85%"]}
                index={1}
                enableDynamicSizing={false}
                backdropComponent={renderBackdrop}
                backgroundStyle={{ backgroundColor: colors.surface }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
            >
                <BottomSheetFlatList
                    data={memberships}
                    keyExtractor={(plan) => plan._id}
                    style={{ marginBottom: bottom }}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.md,
                        paddingBottom: bottom + spacing.md,
                        gap: spacing.sm,
                    }}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={themed($sheetHeader)}>
                            <Text weight="bold" size="lg" style={{ color: colors.text }}>Choose Plan</Text>
                            <Text size="xs" style={{ color: colors.textDim }}>Select a membership tier for the client</Text>
                        </View>
                    }
                    renderItem={({ item: plan }) => {
                        const isSelected = selected?._id === plan._id
                        return (
                            <Pressable
                                onPress={() => selectPlan(plan)}
                                style={[
                                    themed($planCard),
                                    isSelected && {
                                        borderColor: colors.primary,
                                        borderWidth: 2,
                                        backgroundColor: colors.primaryBackground,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text weight="semiBold" size="md" style={{ color: colors.text }}>{plan.planName}</Text>
                                    <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>{getDuration(plan)} · {plan.planType}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text weight="bold" size="lg" style={{ color: colors.text }}>₹{plan.price}</Text>
                                    {isSelected && (
                                        <View style={[themed($check), { backgroundColor: colors.primary }]}>
                                            <Check size={14} color={colors.background} />
                                        </View>
                                    )}
                                </View>
                            </Pressable>
                        )
                    }}
                />
            </BottomSheetModal>

            {selected && selected.planType !== 'indivisual' && (
                <>
                    <ClientSectionLabel
                        title="Group Members"
                        subtitle={`${form.dependents.length + 1} / ${selected.membersAllowed} slots`}
                        right={<Users size={16} color={colors.textDim} />}
                    />
                    <View style={[themed($card), { padding: spacing.md, marginBottom: spacing.sm }]}>
                        <Text size="xxs" style={{ color: colors.textDim, marginBottom: 6 }}>PRIMARY PAYER</Text>
                        <View style={$styles.flexRow}>
                            <View style={[themed($avatar), { backgroundColor: colors.primaryBackground }]}>
                                <Octicons name="person" size={18} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text weight="medium">{form.primaryDetails.name}</Text>
                                <Text size="xs" style={{ color: colors.textDim }}>{form.primaryDetails.gender}</Text>
                            </View>
                            <Entypo name="lock" size={18} color={colors.textDim} />
                        </View>
                    </View>
                    {form.dependents?.map((dep, index) => (
                        <DependentCard key={index} item={dep} index={index} updateDependent={updateDependent} duplicateNo={duplicateNo} updateExistingDependent={updateExistingDependent} />
                    ))}
                    {form.dependents.length < selected.membersAllowed - 1 && (
                        <Pressable style={themed($dashedBtn)} onPress={addMember}>
                            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                            <Text style={{ color: colors.primary, marginLeft: 8 }} weight="medium">Add dependent</Text>
                        </Pressable>
                    )}
                </>
            )}

            <ClientSectionLabel title="Start Date" subtitle="Back-date up to 1 year is allowed" />

            <Pressable style={themed($dateCard)} onPress={handleDatePicker}>
                <View style={[themed($avatar), { backgroundColor: colors.primaryBackground }]}>
                    <Calendar size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text size="xs" style={{ color: colors.textDim }}>Membership starts</Text>
                    <Text weight="semiBold">{form.startDate ? formatDate(form.startDate, 'dd MMM yyyy') : 'Select date'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            </Pressable>
        </View>
    )
}

export default SelectMembership

const $pickerCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
})

const $sheetHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
})

const $planCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
})

const $check: ThemedStyle<ViewStyle> = () => ({
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
})

const $card: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
})

const $avatar: ThemedStyle<ViewStyle> = () => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
})

const $dashedBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary + '60',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
})

const $dateCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
})
