import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen';
import { $styles } from '@/theme/styles';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import OnBoardingStepsHeader from '@/components/OnBoardingStepsHeader';
import { MembershipRenewType, STEPS } from '@/utils/types';
import SelectMembership from './SelectMembership';
import { api } from '@/services/Api';
import MembershipPayment from './MembershipPayment';
import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';
import { selectLoading, setLoading } from '@/redux/state/GymStates';
import { useAppDispatch, useAppSelector } from '@/redux/Hooks';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { goBack } from '@/navigators/navigationUtilities';
import { addDays } from 'date-fns';

const RenewMembership = ({ route }: any) => {
    const client = route?.params?.client;
    const newStartDate = ['trial_expired', 'trial'].includes(client?.membershipStatus) ? new Date() : addDays(new Date(client?.currentEndDate), 1); //if was on trial then his membership new should start from today else from last expiry date

    const dispatch = useAppDispatch();
    const loader = useAppSelector(selectLoading);

    const [datePicker, setDatePicker] = useState<boolean>(false);
    const [form, setForm] = useState<MembershipRenewType>({ id: client?._id, amount: 0, method: 'Cash', paymentReceived: true, startDate: newStartDate });
    const Steps = ["Membership", "Payment"] as STEPS[];
    const [currentStep, setCurrentStep] = useState<STEPS>("Membership");
    const [memberships, setMemberships] = useState<{ [key: string]: any }[]>([]);
    const [selectedMembership, setSelectedMembership] = useState<{ [key: string]: any }[]>([]);

    const handleForm = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
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
            const memberships = response.data.filter((item: any) => item.active).map((item: any) => ({ ...item, label: `${item.planName} - ₹${item.price}` }));
            const defaultMem = memberships.find((item: any) => item._id === client?.activeMembership?.planId) ?? memberships?.[0];
            setSelectedMembership([defaultMem]);
            handleForm('amount', defaultMem?.price);
            setMemberships(memberships);
        }
    };

    const handleRenew = async () => {
        dispatch(setLoading({ loading: true }));
        const body = { ...form, startDate: form.startDate?.toISOString().split('T')[0], planId: selectedMembership?.[0]?._id };
        const response = await api.renewMembership(body);
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
                isVisible={datePicker}
                mode="date"
                minimumDate={newStartDate}
                date={form.startDate ?? new Date()}
                onConfirm={async (date) => {
                    handleForm('startDate', date);
                    setDatePicker(false);
                }}
                onCancel={() => setDatePicker(false)}
            />
            <View style={{ flex: 1 }}>
                <OnBoardingStepsHeader moveStep={moveStep} currentStep={currentStep} steps={Steps} renew={true} />
                <ScrollView style={{ paddingHorizontal: 15, flex: 1 }}>
                    {
                        currentStep === 'Membership' ?
                            <SelectMembership memberships={memberships} setSelectedMembership={setSelectedMembership} selectedMembership={selectedMembership} handleForm={handleForm} handleDatePicker={() => { setDatePicker(true) }} form={form} />
                            :
                            <MembershipPayment handleForm={handleForm} form={form} />
                    }
                </ScrollView>
                <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
                    <Button disabledStyle={{ opacity: 0.4 }} text={currentStep === 'Payment' ? (loader ? 'Renewing...' : 'Renew Membership') : 'Next Step'} preset="reversed" RightAccessory={currentStep === 'Payment' ? undefined : () => <Ionicons name='arrow-forward' size={20} color={colors.background} style={{ marginLeft: 5 }} />} onPress={async () => { currentStep == 'Payment' ? await handleRenew() : moveStep('next') }} />
                </View>
            </View>
        </Screen>
    )
}

export default RenewMembership

const styles = StyleSheet.create({})