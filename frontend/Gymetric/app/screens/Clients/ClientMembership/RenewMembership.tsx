import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen';
import { $styles } from '@/theme/styles';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import OnBoardingStepsHeader from '@/components/OnBoardingStepsHeader';
import { ClientOnBoardingType, MembershipRenewType, STEPS } from '@/utils/types';
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
import { addDays, format } from 'date-fns';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DEVICE_WIDTH } from '@/utils/Constants';
import { validateNextStep } from '@/utils/Helper';

const RenewMembership = ({ route }: any) => {
    const client = route?.params?.client;
    const newStartDate = ['trial_expired', 'trial'].includes(client?.membershipStatus) ? new Date() : addDays(new Date(client?.activeMembership?.endDate), 1); //if was on trial then his membership new should start from today else from last expiry date

    const dispatch = useAppDispatch();
    const loader = useAppSelector(selectLoading);

    const [datePicker, setDatePicker] = useState<boolean>(false);
    const [form, setForm] = useState<ClientOnBoardingType>({ primaryDetails: { id: client?._id, name: client?.name, phoneNumber: client?.phoneNumber, gender: client?.gender }, amount: 0, method: 'Cash', paymentReceived: true, startDate: newStartDate, dependents: [] });
    const Steps = ["Membership", "Payment"] as STEPS[];
    const [currentStep, setCurrentStep] = useState<STEPS>("Membership");
    const [memberships, setMemberships] = useState<{ [key: string]: any }[]>([]);
    const [selectedMembership, setSelectedMembership] = useState<{ [key: string]: any }[]>([]);
    const [duplicateNo, setDuplicateNo] = useState<string>('');
    const translateX = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const handleForm = (field: string, value: any, scope: 'root' | 'primaryDetails' = 'root') => {
        setForm(prev => {
            if (scope === 'primaryDetails') {
                return { ...prev, primaryDetails: { ...prev.primaryDetails, [field]: value } };
            }
            return { ...prev, [field]: value };
        });
    };

    const animateStep = (direction: 'next' | 'prev') => {
        translateX.value = withTiming(
            direction === 'next' ? -DEVICE_WIDTH : DEVICE_WIDTH,
            { duration: 150 },
            () => {
                translateX.value = direction === 'next' ? DEVICE_WIDTH : -DEVICE_WIDTH
                translateX.value = withTiming(0, { duration: 150 })
            }
        )
    }

    const moveStep = (direction: "next" | "prev") => {
        if (currentStep === 'Membership' && direction === 'next') {
            const isValid = validateNextStep(form, selectedMembership);
            if (!isValid) return;
        }
        animateStep(direction);
        setCurrentStep((prevStep) => {
            const currentIndex = Steps.indexOf(prevStep)
            if (direction === "next") {
                return Steps[Math.min(currentIndex + 1, Steps.length - 1)]
            }
            return Steps[Math.max(currentIndex - 1, 0)]
        })
    };

    const validateSteps = () => {
        if (currentStep === 'Membership') {
            return !duplicateNo && !(form.dependents.length + 1 < selectedMembership?.[0]?.membersAllowed);
        }
        return true;
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
        const body = { ...form, id: form.primaryDetails?.id, startDate: format(form.startDate, 'yyyy-MM-dd'), planId: selectedMembership?.[0]?._id };
        const response = await api.renewMembership(body);
        dispatch(setLoading({ loading: false }));
        if (response.kind == 'ok') {
            Toast.show({ type: 'success', text1: 'Membership renewed successfully' });
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
                <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                    <ScrollView style={{ paddingHorizontal: 15, flex: 1 }}>
                        {
                            currentStep === 'Membership' ?
                                <SelectMembership setForm={setForm} memberships={memberships} setSelectedMembership={setSelectedMembership} selectedMembership={selectedMembership} handleForm={handleForm} handleDatePicker={() => { setDatePicker(true) }} form={form}
                                    duplicateNo={duplicateNo} setDuplicateNo={setDuplicateNo} />
                                :
                                <MembershipPayment handleForm={handleForm} form={form} selectedMembership={selectedMembership?.[0]} />
                        }
                    </ScrollView>
                </Animated.View>

                <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
                    <Button disabled={!validateSteps()} disabledStyle={{ opacity: 0.4 }} text={currentStep === 'Payment' ? (loader ? 'Renewing...' : 'Renew Membership') : 'Next Step'} preset="reversed" RightAccessory={currentStep === 'Payment' ? undefined : () => <Ionicons name='arrow-forward' size={20} color={colors.background} style={{ marginLeft: 5 }} />} onPress={async () => { currentStep == 'Payment' ? await handleRenew() : moveStep('next') }} />
                </View>
            </View>
        </Screen>
    )
}

export default RenewMembership

const styles = StyleSheet.create({})