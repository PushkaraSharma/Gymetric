import { Pressable, StyleSheet, Text, View } from 'react-native'
import React, { FC } from 'react'
import { Header } from './Header'
import { useAppTheme } from '@/theme/context';
import { $styles } from '@/theme/styles';
import { Ionicons } from '@expo/vector-icons';
import { STEPS } from '@/utils/types';
import { goBack } from '@/navigators/navigationUtilities';
import { colors } from '@/theme/colors';

type Props = {
    steps: STEPS[],
    currentStep: STEPS,
    moveStep: (direction: "next" | "prev") => void,
    renew?: boolean
}

const OnBoardingStepsHeader: FC<Props> = ({ steps, currentStep, moveStep, renew }) => {
    const { themed } = useAppTheme();

    const ProgressStep = ({ label, isCompleted, isActive, index}: { label: string, isCompleted: boolean, isActive: boolean, index: number }) => (
        <View style={{ flex: 1, marginRight: steps.length-1==index ? 0 : 10 }}>
            <View style={{ height: 5, borderRadius: 10, backgroundColor: isCompleted || isActive ? colors.tint : colors.tintInactive, marginBottom: 6 }} />
            <Text style={{ textAlign: "center", color: isActive ? colors.tint : colors.tintInactive }}>
                {label}
            </Text>
        </View>
    );

    return (
        <View>
            <Header title={renew ? 'Renew Membership' : 'Add Client'}
                LeftActionComponent={
                    <Pressable style={themed([$styles.row, { paddingHorizontal: 10 }])} onPress={() => { currentStep === steps[0] ? goBack() : moveStep('prev') }}>
                        <Ionicons name={currentStep === steps[0] ? 'close' : 'chevron-back'} size={25} />
                    </Pressable>
                } />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 15, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                {steps.map((step, index) => {
                    const currentIndex = steps.indexOf(currentStep)
                    const isCompleted = index < currentIndex
                    const isActive = index === currentIndex
                    return (
                        <ProgressStep key={step} label={step} isCompleted={isCompleted} isActive={isActive} index={index}/>
                    )
                })}
            </View>
        </View>
    )
}

export default OnBoardingStepsHeader

const styles = StyleSheet.create({})