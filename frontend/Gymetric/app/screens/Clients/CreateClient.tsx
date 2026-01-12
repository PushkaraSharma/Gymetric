import { Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import React, { useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import { ThemeProvider } from '@react-navigation/native'
import { useAppTheme } from '@/theme/context'
import { Ionicons } from '@expo/vector-icons'
import { goBack } from '@/navigators/navigationUtilities'
import { colors } from '@/theme/colors'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { ThemedStyle } from '@/theme/types'

type ClientFormType = {
    name: string,
    phoneNumber: string,
    age: number | null,
    birthday: Date | null,
    gender: string,
}


const CreateClient = () => {
    const { themed } = useAppTheme();
    const STEPS = ["Personal Info", "Membership", "Payment"] as const
    type Step = typeof STEPS[number];
    const [currentStep, setCurrentStep] = useState<Step>("Personal Info");
    const [form, setForm] = useState<ClientFormType>({ name: '', phoneNumber: '', age: null, birthday: null, gender: 'male' });

    const handleForm = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }

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

    };

    return (
        <Screen
            preset="fixed"
            contentContainerStyle={[$styles.flex1]}
            safeAreaEdges={["bottom"]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
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
                            <View style={{ marginTop: 15 }}>
                                <Text preset='heading'>Personal Details</Text>
                                <Text weight='light'>Please enter the client's basic information.</Text>
                                <View style={{ marginTop: 20 }}>
                                    <TextField
                                        //   status={validation.type === 'username' ? 'error' : undefined}
                                        value={form.name}
                                        onChangeText={(val) => { handleForm('name', val) }}
                                        containerStyle={themed($textField)}
                                        autoCapitalize="words"
                                        autoCorrect={false}
                                        //   helper={validation.type === 'username' ? validation.msg : undefined}
                                        label="Full Name"
                                        placeholder="e.g. John Doe"
                                    />
                                    <TextField
                                        //   status={validation.type === 'username' ? 'error' : undefined}
                                        value={form.phoneNumber}
                                        onChangeText={(val) => { handleForm('phoneNumber', val) }}
                                        containerStyle={themed($textField)}
                                        keyboardType='number-pad'
                                        autoCorrect={false}
                                        //   helper={validation.type === 'username' ? validation.msg : undefined}
                                        label="Phone Number"
                                        placeholder="Enter phone number"
                                    />
                                    <View style={[$styles.flexRow, { alignItems: 'baseline' }]}>
                                        <TextField
                                            //   status={validation.type === 'username' ? 'error' : undefined}
                                            value={form.age?.toString()}
                                            onChangeText={(val) => { handleForm('age', val ? Number(val) : null) }}
                                            containerStyle={[themed($textField), { width: '30%' }]}
                                            keyboardType='number-pad'
                                            autoCorrect={false}
                                            //   helper={validation.type === 'username' ? validation.msg : undefined}
                                            label="Age"
                                            placeholder="Enter age"
                                        />
                                        <View style={{ width: '60%' }}>
                                            <Text weight='medium'>Birthday</Text>
                                            <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.palette.neutral400, borderRadius: 5 }}>
                                                <Text style={{ color: form.birthday ? '#000' : colors.textDim }}>dd/mm/yyyy</Text>
                                                <Ionicons name='calendar-outline' size={20} color={colors.textDim} />
                                            </Pressable>
                                        </View>
                                    </View>
                                    <View>
                                        <Text weight='medium'>Gender</Text>
                                        <View style={[$styles.flexRow, { backgroundColor: colors.tintInactive, padding: 4, borderRadius: 10, marginTop: 8 }]}>
                                            {
                                                ['Male', 'Female', 'Other'].map((gender: string, index: number) => {
                                                    const selected = form.gender === gender.toLowerCase();
                                                    return (
                                                        <Pressable key={index} style={{ backgroundColor: selected ? colors.background : colors.tintInactive, width: '30%', alignItems: 'center', padding: 10, borderRadius: 10 }} onPress={() => { handleForm('gender', gender.toLowerCase()) }}>
                                                            <Text weight={selected ? 'medium' : 'normal'} style={{ color: selected ? colors.tint : colors.text }}>{gender}</Text>
                                                        </Pressable>
                                                    )
                                                })
                                            }
                                        </View>
                                    </View>
                                </View>
                            </View> :
                            currentStep === 'Membership' ?
                                <View style={{ marginTop: 15 }}>
                                    <Text preset='heading'>Select Membership</Text>
                                </View> :
                                <View style={{ marginTop: 15 }}>
                                    <Text preset='heading'>Payment Details</Text>
                                    <Text weight='light'>Select payment method to finalize enrollment.</Text>
                                </View>
                    }
                </ScrollView>
                <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15 }}>
                    <Button text={currentStep === 'Payment' ? 'Finish Setup' : 'Next Step'} preset="reversed" RightAccessory={currentStep === 'Payment' ? undefined : () => <Ionicons name='arrow-forward' size={20} color={colors.background} style={{ marginLeft: 5 }} />} onPress={async () => { currentStep == 'Payment' ? await handleCreate() : moveStep('next') }} />
                </View>
            </View>

        </Screen>
    )
}

export default CreateClient

const styles = StyleSheet.create({})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    marginBottom: spacing.lg,
})