import React from 'react'
import { View, Pressable, ViewStyle } from 'react-native'
import { Check } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { STEPS } from '@/utils/types'
import { goBack } from '@/navigators/navigationUtilities'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

type Props = {
    steps: STEPS[]
    currentStep: STEPS
    onBack: () => void
    title?: string
}

export function ClientWizardStepper({ steps, currentStep, onBack, title = 'Add Member' }: Props) {
    const { theme: { colors, spacing }, themed } = useAppTheme()
    const currentIndex = steps.indexOf(currentStep)

    return (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
            <View style={themed($topRow)}>
                <Pressable onPress={onBack} style={themed($backBtn)} hitSlop={12}>
                    <Ionicons name={currentIndex === 0 ? 'close' : 'chevron-back'} size={22} color={colors.text} />
                </Pressable>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text weight="bold" size="lg">{title}</Text>
                    <Text size="xs" style={{ color: colors.textDim }}>Step {currentIndex + 1} of {steps.length}</Text>
                </View>
            </View>
            <View style={themed($stepperRow)}>
                {steps.map((step, index) => {
                    const done = index < currentIndex
                    const active = index === currentIndex
                    return (
                        <View key={step} style={{ flex: 1, alignItems: 'center' }}>
                            <View style={[
                                themed($dot),
                                done && { backgroundColor: colors.primary, borderColor: colors.primary },
                                active && { backgroundColor: colors.primaryBackground, borderColor: colors.primary, borderWidth: 2 },
                            ]}>
                                {done ? <Check size={14} color={colors.background} /> : (
                                    <Text size="xxs" weight="bold" style={{ color: active ? colors.primary : colors.textDim }}>{index + 1}</Text>
                                )}
                            </View>
                            <Text size="xxs" numberOfLines={1} style={{ color: active ? colors.primary : colors.textDim, marginTop: 6, fontWeight: active ? '600' : '400' }}>
                                {step}
                            </Text>
                        </View>
                    )
                })}
            </View>
        </SafeAreaView>
    )
}

const $topRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
})

const $backBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
})

const $stepperRow: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
})

const $dot: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
})

const $connector: ThemedStyle<ViewStyle> = () => ({
    position: 'absolute',
    top: 14,
    left: '55%',
    right: '-45%',
    height: 2,
    zIndex: 0,
})
