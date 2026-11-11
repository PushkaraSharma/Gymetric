import React from 'react'
import { View, ViewStyle, TextStyle, TouchableOpacity, Pressable } from 'react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { Bell } from 'lucide-react-native'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'

interface DashboardHeaderProps {
  ownerName: string
  onAvatarPress?: () => void
  onNotificationsPress?: () => void
}

export function DashboardHeader({ ownerName, onAvatarPress, onNotificationsPress }: DashboardHeaderProps) {
  const { themed, theme: { colors } } = useAppTheme()

  const avatar = (
    <View style={themed($avatarRing)}>
      <ProfileInitialLogo name={ownerName || 'Admin'} size={48} sideMargin={false} />
    </View>
  )

  return (
    <View style={themed($header)}>
      {onAvatarPress ? (
        <Pressable onPress={onAvatarPress} hitSlop={4}>
          {avatar}
        </Pressable>
      ) : (
        avatar
      )}
      <View style={$headerText}>
        <Text preset="default" style={themed($greetingLabel)} text="WELCOME BACK" />
        <Text preset="default" style={themed($greeting)} text={`${ownerName}`} />
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

const AVATAR_SIZE = 48

const $avatarRing: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: AVATAR_SIZE + 4,
  height: AVATAR_SIZE + 4,
  borderRadius: (AVATAR_SIZE + 4) / 2,
  borderWidth: 2,
  borderColor: colors.palette.indigo300,
  alignItems: 'center',
  justifyContent: 'center',
})

const $headerText: ViewStyle = { flex: 1, marginLeft: 14 }

const $greetingLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 10,
  lineHeight: 12,
  marginBottom: 0,
  fontWeight: typography.semiBold,
  color: colors.textDim,
})

const $greeting: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.bold,
  fontSize: 20,
  lineHeight: 24,
  marginTop: 2,
  color: colors.text,
})

const $bellButton: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
})
