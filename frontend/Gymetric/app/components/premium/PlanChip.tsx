import React from 'react'
import { View, ViewStyle } from 'react-native'
import { Crown } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { FEATURE_PLAN, type Feature } from '@/utils/permissions'

// Small PRO / MAX tag shown on anything the gym's plan doesn't include yet.
export function PlanChip({ feature, style }: { feature: Feature; style?: ViewStyle }) {
  const { theme: { colors } } = useAppTheme()
  return (
    <View style={[$chip, { backgroundColor: colors.warningBackground }, style]} accessibilityLabel={`${FEATURE_PLAN[feature]} plan`}>
      <Crown size={10} color={colors.warning} strokeWidth={2.5} />
      <Text size="xxs" weight="bold" style={{ color: colors.warning, letterSpacing: 0.5 }} text={FEATURE_PLAN[feature].toUpperCase()} />
    </View>
  )
}

const $chip: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 999,
  alignSelf: 'flex-start',
}
