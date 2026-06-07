import React from 'react'
import { View, Image, ImageStyle, ViewStyle, TextStyle, TouchableOpacity } from 'react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { Bell } from 'lucide-react-native'

interface DashboardHeaderProps {
  ownerName: string
  gymLogo?: string
  isDark: boolean
  onNotificationsPress?: () => void
}

export function DashboardHeader({ ownerName, gymLogo, isDark, onNotificationsPress }: DashboardHeaderProps) {
  const { themed, theme: { colors } } = useAppTheme()

  return (
    <View style={themed($header)}>
      <View style={themed($logoContainer)}>
        {gymLogo ? (
          <Image source={{ uri: gymLogo }} style={$logo} resizeMode="cover" />
        ) : (
          <Image
            source={isDark ? require('@assets/images/app-icon-dark.png') : require('@assets/images/app-icon.png')}
            style={$logo}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={$headerText}>
        <Text style={themed($greetingLabel)} text="WELCOME BACK" />
        <Text style={themed($greeting)} text={`${ownerName}`} />
      </View>
      {onNotificationsPress && (
        <TouchableOpacity onPress={onNotificationsPress} style={themed($bellButton)} hitSlop={8}>
          <Bell size={22} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
})

const $logoContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
})

const $logo: ImageStyle = { width: '100%', height: '100%' }

const $headerText: ViewStyle = { flex: 1, marginLeft: 14 }

const $greetingLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 10,
  fontWeight: typography.semiBold,
  color: colors.textDim,
})

const $greeting: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.bold,
  fontSize: 20,
  color: colors.text,
})

const $bellButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
})
