import React from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { X } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { PlanChip } from '@/components/premium/PlanChip'
import { useNudge } from '@/utils/premium'
import type { Feature } from '@/utils/permissions'

type Props = { place: string; feature: Feature; title: string; body: string; action?: string; style?: ViewStyle; onOpen?: () => void }

// A dismissible Pro nudge. useNudge decides when it may show (owners, plan lacks the feature, weekly cap).
export function UpsellCard({ place, feature, title, body, action = 'See how', style, onOpen }: Props) {
  const { themed, theme: { colors } } = useAppTheme()
  const nudge = useNudge(place, feature)
  if (!nudge.visible) return null
  return (
    <Pressable style={[themed($card), style]} onPress={onOpen ?? nudge.open} accessibilityRole="button" accessibilityHint="Opens plan details">
      <View style={{ flex: 1 }}>
        <PlanChip feature={feature} />
        <Text weight="semiBold" style={{ marginTop: 6 }} text={title} />
        <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }} text={body} />
        <Text size="xs" weight="semiBold" style={{ color: colors.primary, marginTop: 8 }} text={`${action} →`} />
      </View>
      <Pressable onPress={nudge.dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide for a week" style={{ padding: 2 }}>
        <X size={18} color={colors.textDim} />
      </Pressable>
    </Pressable>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.sm,
  padding: spacing.md,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.warning + '55',
  backgroundColor: colors.warningBackground,
  marginBottom: spacing.md,
})
