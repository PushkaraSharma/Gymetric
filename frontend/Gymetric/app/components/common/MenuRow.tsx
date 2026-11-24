import React from 'react'
import { Pressable, View, ViewStyle, TextStyle } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'

type Props = {
  icon: React.ComponentType<{ size: number; color: string }>
  label: string
  description?: string
  onPress?: () => void
  right?: React.ReactNode
  color?: string
  divider?: boolean
}

export function MenuRow({ icon: Icon, label, description, onPress, right, color, divider }: Props) {
  const { themed, theme: { colors } } = useAppTheme()
  const tint = color ?? colors.primary
  return (
    <>
      <Pressable style={themed($item)} onPress={onPress} disabled={!onPress}>
        <View style={[themed($iconBox), { backgroundColor: tint + '18' }]}>
          <Icon size={20} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={themed($label)} text={label} />
          {description ? <Text size="xxs" style={{ color: colors.textDim, marginTop: 1 }} numberOfLines={1} text={description} /> : null}
        </View>
        {right ?? (onPress ? <ChevronRight size={20} color={colors.textDim} /> : null)}
      </Pressable>
      {divider ? <View style={themed($divider)} /> : null}
    </>
  )
}

export function MenuSection({ title, children }: { title?: string; children: React.ReactNode }) {
  const { themed, theme: { spacing } } = useAppTheme()
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {title ? <Text style={themed($sectionTitle)} text={title} /> : null}
      <View style={themed($section)}>{children}</View>
    </View>
  )
}

const $item: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
  paddingVertical: spacing.sm + 2,
  paddingHorizontal: spacing.md,
})

const $iconBox: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
})

const $label: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.semiBold,
  fontSize: 15,
  color: colors.text,
})

const $divider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginLeft: 70,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing, typography }) => ({
  fontSize: 12,
  letterSpacing: 1,
  fontWeight: typography.semiBold,
  color: colors.textDim,
  marginBottom: spacing.xxs,
  marginLeft: 4,
})

const $section: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 20,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: colors.border,
})
