import { Platform, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Ionicons } from '@expo/vector-icons'
import { goBack } from '@/navigators/navigationUtilities'
import { Button } from '@/components/Button'
import { api } from '@/services/Api'
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectLoading, setLoading } from '@/redux/state/GymStates'
import Toast from 'react-native-toast-message'
import { ClientDateType, ClientOnBoardingType, STEPS } from '@/utils/types'
import PersonalInfo from './CreateUpdateClient/PersonalInfo'
import OnBoardingStepsHeader from '@/components/OnBoardingStepsHeader'
import SelectMembership from './ClientMembership/SelectMembership'
import MembershipPayment from './ClientMembership/MembershipPayment'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { DEVICE_WIDTH } from '@/utils/Constants'
import { alreadyExists } from '@/utils/Helper'
import { differenceInYears, format } from 'date-fns'
import { useAppTheme } from '@/theme/context'

const CreateClient = () => {
    const dispatch = useAppDispatch();
    const loader = useAppSelector(selectLoading);
    const { theme: { colors }, themed } = useAppTheme()

    const Steps = ["Personal Info", "Membership", "Payment"] as STEPS[];
    const [currentStep, setCurrentStep] = useState<STEPS>("Personal Info");
    const [form, setForm] = useState<ClientOnBoardingType>({ primaryDetails: { name: '', phoneNumber: '', age: null, birthday: null, gender: 'Male', anniversaryDate: null, onboardingPurpose: 'General Fitness' }, dependents: [], amount: 0, method: 'Cash', paymentReceived: true, startDate: new Date() });
    const [memberships, setMemberships] = useState<{ [key: string]: any }[]>([]);
    const [selectedMembership, setSelectedMembership] = useState<{ [key: string]: any }[]>([]);
    const [datePicker, setDatePicker] = useState<ClientDateType>({ visible: false, type: 'startDate' });
    const [validNumber, setValidNumber] = useState<boolean>(true);
    const [duplicateNo, setDuplicateNo] = useState<string>('');

    const translateX = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

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

    const validateSteps = () => {
        if (currentStep === 'Personal Info') {
            return (memberships.length > 0 && !!form.primaryDetails?.name && form.primaryDetails?.phoneNumber?.length === 10 && validNumber)
        } else if (currentStep === 'Membership') {
            return !duplicateNo && !(form.dependents.length + 1 < selectedMembership?.[0]?.membersAllowed);
        } else {
            return true;
        }
    };

    const handleForm = (field: string, value: any, scope: 'root' | 'primaryDetails' = 'root') => {
        setForm(prev => {
            if (scope === 'primaryDetails') {
                let updatedDetails = { ...prev.primaryDetails, [field]: value };
                if (field === 'birthday' && value) {
                    updatedDetails.age = differenceInYears(new Date(), value);
                }
                return { ...prev, primaryDetails: updatedDetails };
            }
            return { ...prev, [field]: value };
        });
        if (field === 'phoneNumber' && value.length === 10 && alreadyExists(value)) {
            setValidNumber(false);
        } else {
            setValidNumber(true);
        }
    };

    const moveStep = (direction: "next" | "prev") => {
        if (currentStep === 'Membership' && direction === 'next') {
            const invalidDependent = form.dependents.find(dep => !dep.name?.trim() || !(dep.phoneNumber.length === 10));
            if (invalidDependent) {
                Toast.show({ type: 'error', text1: 'Incomplete depedent details' });
                return;
            } else if (selectedMembership?.[0]?.planType === 'couple' && (form.primaryDetails.gender === form.dependents?.[0]?.gender)) {
                Toast.show({ type: 'error', text1: 'For Couple plan gender cannot be same' });
                return;
            }
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
        const body = {
            ...form,
            startDate: format(form.startDate, 'yyyy-MM-dd'),
            planId: selectedMembership?.[0]?._id,
            primaryDetails: {
                ...form.primaryDetails,
                birthday: form.primaryDetails.birthday ? format(form.primaryDetails.birthday, 'yyyy-MM-dd') : null,
                anniversaryDate: form.primaryDetails.anniversaryDate ? format(form.primaryDetails.anniversaryDate, 'yyyy-MM-dd') : null,
            }
        };
        const response = await api.createClient(body);

        if (response.kind == 'ok') {
            // Upload profile picture if provided
            if (form.primaryDetails.profilePicture) {
                const uploadResponse = await api.uploadClientProfilePicture(
                    response.data._id,
                    form.primaryDetails.profilePicture
                );
                if (uploadResponse.kind === 'error') {
                    console.log('Profile picture upload failed, but client created');
                }
            }

            dispatch(setLoading({ loading: false }));
            Toast.show({ type: 'success', text1: 'Client onboarded successfully' });
            goBack();
        } else {
            dispatch(setLoading({ loading: false }));
        }
    };

    useEffect(() => {
        getMemberships();
    }, []);

    return (
        <Screen
            preset={Platform.OS === 'android' ? "auto" : 'fixed'}
            contentContainerStyle={[$styles.flex1]}
            safeAreaEdges={["bottom"]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <DateTimePickerModal
                isVisible={datePicker.visible}
                mode="date"
                minimumDate={datePicker.type === 'startDate' ? new Date() : new Date('1900-01-01')}
                date={datePicker.type === 'birthday' ? (form.primaryDetails.birthday ?? new Date()) : datePicker.type === 'anniversaryDate' ? (form.primaryDetails.anniversaryDate ?? new Date()) : (form.startDate ?? new Date())}
                onConfirm={async (date) => {
                    handleForm(datePicker.type, date, (datePicker.type === 'birthday' || datePicker.type === 'anniversaryDate') ? 'primaryDetails' : 'root');
                    setDatePicker({ visible: false, type: 'startDate' });
                }}
                onCancel={() => setDatePicker({ visible: false, type: 'startDate' })}
            />
            <View style={{ flex: 1 }}>
                <OnBoardingStepsHeader moveStep={moveStep} currentStep={currentStep} steps={Steps} />
                <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                    <ScrollView style={{ paddingHorizontal: 15, flex: 1 }}>
                        {
                            currentStep === 'Personal Info' ?
                                <PersonalInfo handleForm={(field: string, value: any) => { handleForm(field, value, 'primaryDetails') }} form={form.primaryDetails} setDatePicker={setDatePicker} validNumber={validNumber} /> :
                                currentStep === 'Membership' ?
                                    <SelectMembership setForm={setForm} memberships={memberships} setSelectedMembership={setSelectedMembership} selectedMembership={selectedMembership} handleForm={handleForm} handleDatePicker={() => { setDatePicker({ visible: true, type: 'startDate' }) }} form={form}
                                        duplicateNo={duplicateNo} setDuplicateNo={setDuplicateNo} />
                                    :
                                    <MembershipPayment handleForm={handleForm} form={form} selectedMembership={selectedMembership?.[0]} />
                        }
                    </ScrollView>
                </Animated.View>
                <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
                    <Button disabled={!validateSteps()} disabledStyle={{ opacity: 0.4 }} text={currentStep === 'Payment' ? (loader ? 'Finishing...' : 'Finish Setup') : 'Next Step'} preset="reversed" RightAccessory={currentStep === 'Payment' ? undefined : () => <Ionicons name='arrow-forward' size={20} color={colors.white} style={{ marginLeft: 5 }} />} onPress={async () => { currentStep == 'Payment' ? await handleCreate() : moveStep('next') }} />
                </View>
            </View>
        </Screen>
    )
}

export default CreateClient

const styles = StyleSheet.create({})




