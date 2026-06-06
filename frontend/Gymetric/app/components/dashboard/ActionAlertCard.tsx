import React from 'react'
import { View, Pressable, ViewStyle, TextStyle } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'

interface ActionAlertCardProps {
  label: string
  title: string
  description: string
  primaryAction: string
  secondaryAction?: string
  onPrimaryPress: () => void
  onSecondaryPress?: () => void
  variant?: 'warning' | 'danger' | 'info'
}

export function ActionAlertCard({
  label,
  title,
  description,
  primaryAction,
  secondaryAction,
  onPrimaryPress,
  onSecondaryPress,
  variant = 'warning',
}: ActionAlertCardProps) {
  const { themed, theme: { colors } } = useAppTheme()
  const dotColor = variant === 'danger' ? colors.error : variant === 'info' ? colors.primary : colors.palette.indigo500

  return (
    <View style={themed($card)}>
      <View style={$topRow}>
        <View style={[themed($statusDot), { backgroundColor: dotColor }]} />
        <Text style={themed($label)} text={label} />
        <View style={{ flex: 1 }} />
        <View style={[themed($badge), { backgroundColor: dotColor + '20' }]}>
          <Text style={[themed($badgeText), { color: dotColor }]} text="ACTION NEEDED" />
        </View>
      </View>
      <Text style={themed($title)} text={title} />
      <Text style={themed($description)} text={description} />
      <View style={$actionRow}>
        <Pressable style={themed($button)} onPress={onPrimaryPress}>
          <Text style={themed($buttonText)} text={primaryAction} />
        </Pressable>
        {secondaryAction && onSecondaryPress && (
          <Pressable style={themed($secondaryButton)} onPress={onSecondaryPress}>
            <Text style={themed($secondaryButtonText)} text={secondaryAction} />
          </Pressable>
        )}
        <Pressable style={themed($navButton)} onPress={onPrimaryPress}>
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
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
const $topRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }
const $statusDot: ThemedStyle<ViewStyle> = () => ({ width: 8, height: 8, borderRadius: 4, marginRight: 8 })
const $label: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 10, letterSpacing: 1, fontWeight: '700', color: colors.textDim })
const $badge: ThemedStyle<ViewStyle> = () => ({ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 })
const $badgeText: ThemedStyle<TextStyle> = () => ({ fontSize: 9, fontWeight: '700', letterSpacing: 0.5 })
const $title: ThemedStyle<TextStyle> = ({ typography, colors, spacing }) => ({ fontWeight: typography.bold, fontSize: 28, color: colors.text, marginBottom: spacing.xs })
const $description: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({ fontSize: 13, color: colors.textDim, marginBottom: spacing.md })
const $actionRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 8 }
const $button: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ flex: 1, backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, alignItems: 'center' })
const $buttonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({ color: colors.background, fontWeight: typography.semiBold, fontSize: 14 })
const $secondaryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border })
const $secondaryButtonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({ color: colors.text, fontWeight: typography.medium, fontSize: 13 })
const $navButton: ThemedStyle<ViewStyle> = ({ colors }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border })
