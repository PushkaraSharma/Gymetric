import React from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { hapticsSelection } from '@/utils/haptics'

type Option<T extends string> = { value: T; label: string; badge?: number }

export function Segmented<T extends string>({ options, value, onChange, style }: {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  style?: ViewStyle
}) {
  const { themed, theme: { colors } } = useAppTheme()
  return (
    <View style={[themed($track), style]}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            style={[themed($segment), active && themed($active)]}
            onPress={() => {
              if (active) return
              hapticsSelection()
              onChange(option.value)
            }}
          >
            <Text size="xs" weight="semiBold" style={{ color: active ? colors.text : colors.textDim }} text={option.label} />
            {option.badge ? (
              <View style={themed($badge)}>
                <Text size="xxs" weight="bold" style={{ color: colors.white, fontSize: 11, lineHeight: 14 }} text={option.badge > 99 ? '99+' : String(option.badge)} />
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const $track: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  padding: 4,
  borderRadius: 14,
  backgroundColor: colors.border,
})

const $segment: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingVertical: 8,
  borderRadius: 10,
})

const $active: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
})

const $badge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minWidth: 18,
  paddingHorizontal: 5,
  borderRadius: 9,
  backgroundColor: colors.success,
  alignItems: 'center',
})
