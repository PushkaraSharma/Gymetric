import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, ViewStyle } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { goBack } from '@/navigators/navigationUtilities'
import { colors } from '@/theme/colors'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { ThemedStyle } from '@/theme/types'
import { SelectField } from '@/components/SelectField'
import { spacing } from '@/theme/spacing'
import { api } from '@/services/api'
import { Switch } from '@/components/Toggle/Switch'
import { formatDate } from 'date-fns/format'
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectLoading, setLoading } from '@/redux/state/GymStates'
import Toast from 'react-native-toast-message'
import { ClientDateType, ClientFormType } from '@/utils/types'
import PersonalInfo from './ClientDetails/PersonalInfo'


const CreateClient = () => {
    const { themed } = useAppTheme();
    const dispatch = useAppDispatch();
    const loader = useAppSelector(selectLoading);
    const STEPS = ["Personal Info", "Membership", "Payment"] as const
    type Step = typeof STEPS[number];
    const [currentStep, setCurrentStep] = useState<Step>("Personal Info");
    const [form, setForm] = useState<ClientFormType>({ name: '', phoneNumber: '', age: null, birthday: null, gender: 'Male', amount: 0, method: 'Cash', paymentReceived: true, startDate: new Date() });
    const [memberships, setMemberships] = useState<{ [key: string]: any }[]>([]);
    const [selectedMembership, setSelectedMembership] = useState<{ [key: string]: any }[]>([]);
    const [datePicker, setDatePicker] = useState<ClientDateType>({ visible: false, type: 'startDate' });

    const handleForm = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const validateSteps = () => {
        if (currentStep === 'Personal Info') {
            return (!!form.name && form.phoneNumber?.length === 10)
        } else if (currentStep === 'Membership') {
            return true;
        } else {
            return true;
        }
    };

    const getMemberships = async () => {
        const response = await api.allMemberships();
        if (response.kind === 'ok') {
            const firstMem = response.data?.[0];
            setSelectedMembership([firstMem]);
            handleForm('amount', firstMem?.price);
            setMemberships(response.data);
        }
    };

    const ProgressStep = ({ label, isCompleted, isActive, }: { label: string, isCompleted: boolean, isActive: boolean }) => (
        <View style={{ width: "30%" }}>
            <View style={{ height: 5, borderRadius: 10, backgroundColor: isCompleted || isActive ? colors.tint : colors.tintInactive, marginBottom: 6 }} />
            <Text style={{ textAlign: "center", color: isActive ? colors.tint : colors.tintInactive }}>
                {label}
            </Text>
        </View>
    );

    const moveStep = (direction: "next" | "prev") => {
        setCurrentStep((prevStep) => {
            const currentIndex = STEPS.indexOf(prevStep)
            if (direction === "next") {
                return STEPS[Math.min(currentIndex + 1, STEPS.length - 1)]
            }
            return STEPS[Math.max(currentIndex - 1, 0)]
        })
    };

    const handleCreate = async () => {
        dispatch(setLoading({ loading: true }));
        const body = { ...form, planId: selectedMembership?.[0]?._id };
        const response = await api.createClient(body);
        dispatch(setLoading({ loading: false }));
        if (response.kind == 'ok') {
            Toast.show({ type: 'success', text1: 'Client onboarded successfully' });
            goBack();
        }
    };

    useEffect(() => {
        getMemberships();
    }, []);

    return (
        <Screen
            preset="fixed"
            contentContainerStyle={[$styles.flex1]}
            safeAreaEdges={["bottom"]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <DateTimePickerModal
                isVisible={datePicker.visible}
                mode="date"
                date={datePicker.type === 'birthday' ? new Date() : form.startDate ?? new Date()}
                onConfirm={async (date) => {
                    handleForm(datePicker.type, date);
                    setDatePicker({ visible: false, type: 'startDate' });
                }}
                onCancel={() => setDatePicker({ visible: false, type: 'startDate' })}
            />
            <View style={{ flex: 1 }}>
                <View>
                    <Header title='Add Client'
                        LeftActionComponent={
                            <Pressable style={themed([$styles.row, { paddingHorizontal: 10 }])} onPress={() => { currentStep === 'Personal Info' ? goBack() : moveStep('prev') }}>
                                <Ionicons name={currentStep === 'Personal Info' ? 'close' : 'chevron-back'} size={25} />
                            </Pressable>
                        } />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 15, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                        {STEPS.map((step, index) => {
                            const currentIndex = STEPS.indexOf(currentStep)
                            const isCompleted = index < currentIndex
                            const isActive = index === currentIndex
                            return (
                                <ProgressStep key={step} label={step} isCompleted={isCompleted} isActive={isActive} />
                            )
                        })}
                    </View>
                </View>
                <ScrollView style={{ paddingHorizontal: 15, flex: 1 }}>
                    {
                        currentStep === 'Personal Info' ?
                            <PersonalInfo handleForm={handleForm} form={form} setDatePicker={setDatePicker} /> :
                            currentStep === 'Membership' ?
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
                                                labelKey={'planName'}
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
                                                <Pressable style={{ width: '60%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.palette.neutral400, borderRadius: 5 }} onPress={() => { setDatePicker({ visible: true, type: 'startDate' }) }}>
                                                    <Text style={{ color: form.startDate ? '#000' : colors.textDim }}>{form.startDate ? formatDate(form.startDate, 'dd/MM/yyyy') : 'dd/mm/yyyy'}</Text>
                                                    <Ionicons name='calendar-outline' size={20} color={colors.textDim} />
                                                </Pressable>
                                            </View>
                                            <Text size='xs' style={themed({ color: colors.textDim, textAlign: 'center' })}>Prices may vary based on promotional codes applied at the final step.</Text>
                                        </View>
                                    </View>
                                </View> :
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
                                                <Text style={{ alignSelf: 'flex-end', marginLeft: 5 }}>/month</Text>
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
                    }
                </ScrollView>
                <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
                    <Button disabled={!validateSteps()} disabledStyle={{ opacity: 0.4 }} text={currentStep === 'Payment' ? (loader ? 'Finishing...' : 'Finish Setup') : 'Next Step'} preset="reversed" RightAccessory={currentStep === 'Payment' ? undefined : () => <Ionicons name='arrow-forward' size={20} color={colors.background} style={{ marginLeft: 5 }} />} onPress={async () => { currentStep == 'Payment' ? await handleCreate() : moveStep('next') }} />
                </View>
            </View>

        </Screen>
    )
}

export default CreateClient

const styles = StyleSheet.create({})



const $membershipItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    ...$styles.flexRow,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xs
})

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




