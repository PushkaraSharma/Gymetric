import { Platform, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { useAppTheme } from '@/theme/context'
import { Ionicons } from '@expo/vector-icons'
import { goBack } from '@/navigators/navigationUtilities'
import { colors } from '@/theme/colors'
import { Button } from '@/components/Button'
import { ThemedStyle } from '@/theme/types'
import { api } from '@/services/api'
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectLoading, setLoading } from '@/redux/state/GymStates'
import Toast from 'react-native-toast-message'
import { ClientDateType, ClientFormType, STEPS } from '@/utils/types'
import PersonalInfo from './CreateUpdateClient/PersonalInfo'
import OnBoardingStepsHeader from '@/components/OnBoardingStepsHeader'
import SelectMembership from './ClientMembership/SelectMembership'
import MembershipPayment from './ClientMembership/MembershipPayment'

const CreateClient = () => {
    const dispatch = useAppDispatch();
    const loader = useAppSelector(selectLoading);
    const Steps = ["Personal Info", "Membership", "Payment"] as STEPS[];
    const [currentStep, setCurrentStep] = useState<STEPS>("Personal Info");
    const [form, setForm] = useState<ClientFormType>({ name: '', phoneNumber: '', age: null, birthday: null, gender: 'Male', amount: 0, method: 'Cash', paymentReceived: true, startDate: new Date() });
    const [memberships, setMemberships] = useState<{ [key: string]: any }[]>([]);
    const [selectedMembership, setSelectedMembership] = useState<{ [key: string]: any }[]>([]);
    const [datePicker, setDatePicker] = useState<ClientDateType>({ visible: false, type: 'startDate' });

    const handleForm = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const validateSteps = () => {
        if (currentStep === 'Personal Info') {
            return (memberships.length > 0 && !!form.name && form.phoneNumber?.length === 10)
        } else if (currentStep === 'Membership') {
            return true;
        } else {
            return true;
        }
    };

    const moveStep = (direction: "next" | "prev") => {
        setCurrentStep((prevStep) => {
            const currentIndex = Steps.indexOf(prevStep)
            if (direction === "next") {
                return Steps[Math.min(currentIndex + 1, Steps.length - 1)]
            }
            return Steps[Math.max(currentIndex - 1, 0)]
        })
    };

    const getMemberships = async () => {
        const response = await api.allMemberships();
        if (response.kind === 'ok') {
            if (response.data.length === 0) {
                Toast.show({ type: 'error', text1: 'No membership to assign', text2: 'Please create membership in settings first', visibilityTime: 2000 });
                return;
            }
            const memberships = response.data.filter((item: any) => item.active).map((item: any) => ({ ...item, label: `${item.planName} - ₹${item.price}` }));
            const firstMem = memberships?.[0];
            setSelectedMembership([firstMem]);
            handleForm('amount', firstMem?.price);
            setMemberships(memberships);
        }
    };

    const handleCreate = async () => {
        dispatch(setLoading({ loading: true }));
        const body = { ...form, startDate: form.startDate?.toISOString().split('T')[0], planId: selectedMembership?.[0]?._id };
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
                minimumDate={datePicker.type === 'startDate' ? new Date() : new Date('1900-01-01')}
                date={datePicker.type === 'birthday' ? new Date() : form.startDate ?? new Date()}
                onConfirm={async (date) => {
                    handleForm(datePicker.type, date);
                    setDatePicker({ visible: false, type: 'startDate' });
                }}
                onCancel={() => setDatePicker({ visible: false, type: 'startDate' })}
            />
            <View style={{ flex: 1 }}>
                <OnBoardingStepsHeader moveStep={moveStep} currentStep={currentStep} steps={Steps} />
                <ScrollView style={{ paddingHorizontal: 15, flex: 1 }}>
                    {
                        currentStep === 'Personal Info' ?
                            <PersonalInfo handleForm={handleForm} form={form} setDatePicker={setDatePicker} /> :
                            currentStep === 'Membership' ?
                                <SelectMembership memberships={memberships} setSelectedMembership={setSelectedMembership} selectedMembership={selectedMembership} handleForm={handleForm} handleDatePicker={() => { setDatePicker({ visible: true, type: 'startDate' }) }} form={form} />
                                :
                                <MembershipPayment handleForm={handleForm} form={form} />
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




