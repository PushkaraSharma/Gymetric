import React from 'react'
import { Pressable, View, ViewStyle, TextStyle } from 'react-native'
import { ChevronRight, MessageCircle } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'

type Counts = {
  queued?: number
  sent?: number
  delivered?: number
  read?: number
  failed?: number
  skipped?: number
  deliveryRate?: number
}

type Props = {
  today?: Counts
  last7Days?: Counts
  onPress: () => void
}

export function WhatsAppWidget({ today, last7Days, onPress }: Props) {
  const { themed, theme: { colors } } = useAppTheme()
  const totalToday = (today?.queued || 0) + (today?.sent || 0) + (today?.delivered || 0) + (today?.read || 0)
  const deliveredToday = (today?.delivered || 0) + (today?.read || 0)
  const failedToday = today?.failed || 0
  const weekRate = last7Days?.deliveryRate ?? 0

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View style={themed($card)}>
        <View style={$header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={18} color={colors.success} />
            <Text style={themed($label)} text="WHATSAPP TODAY" />
          </View>
          <ChevronRight size={18} color={colors.textDim} />
        </View>
        <View style={$statsRow}>
          <View style={themed($stat)}>
            <Text weight="bold" size="lg">{totalToday}</Text>
            <Text size="xxs" style={{ color: colors.textDim }}>Total</Text>
          </View>
          <View style={themed($stat)}>
            <Text weight="bold" size="lg" style={{ color: colors.success }}>{deliveredToday}</Text>
            <Text size="xxs" style={{ color: colors.textDim }}>Delivered</Text>
          </View>
          <View style={[themed($stat), { borderRightWidth: 0, marginRight: 0 }]}>
            <Text weight="bold" size="lg" style={{ color: failedToday ? colors.error : colors.text }}>{failedToday}</Text>
            <Text size="xxs" style={{ color: colors.textDim }}>Failed</Text>
          </View>
        </View>
        <Text size="xxs" style={{ color: colors.textDim, marginTop: 10 }}>
          {weekRate}% delivered in the last 7 days
        </Text>
      </View>
    </Pressable>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 20,
  padding: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})
const $header: ViewStyle = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const $label: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 10,
  letterSpacing: 1,
  fontWeight: typography.bold,
  color: colors.textDim,
})
const $statsRow: ViewStyle = { flexDirection: 'row' }
const $stat: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  alignItems: 'flex-start',
  borderRightWidth: 1,
  borderRightColor: colors.border,
  paddingRight: 8,
  marginRight: 8,
})
