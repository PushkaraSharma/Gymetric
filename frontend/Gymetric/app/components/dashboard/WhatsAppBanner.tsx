import React from 'react'
import { View, TouchableOpacity, ViewStyle, TextStyle } from 'react-native'
import { MotiView } from 'moti'
import { MessageCircle, X } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { navigate } from '@/navigators/navigationUtilities'

interface WhatsAppBannerProps {
  onDismiss: () => void
}

export function WhatsAppBanner({ onDismiss }: WhatsAppBannerProps) {
  const { themed, theme: { colors, spacing, typography } } = useAppTheme()

  return (
    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={themed($banner)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MessageCircle size={20} color="white" style={{ marginRight: 8 }} />
          <Text preset="bold" style={{ color: 'white', fontSize: 16 }} text="Premium Integration" />
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X color="white" size={20} />
        </TouchableOpacity>
      </View>
      <Text
        size="xs"
        style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, marginBottom: 12, lineHeight: 18 }}
        text="Automate reminders, welcome messages & engage clients seamlessly on WhatsApp."
      />
      <Button
        title="Learn More"
        variant="primary"
        style={{ backgroundColor: 'white', height: 36, minHeight: 36, paddingVertical: 0, alignSelf: 'flex-start', paddingHorizontal: 16 }}
        textStyle={{ color: colors.primary, fontSize: 12, fontWeight: typography.bold }}
        onPress={() => navigate('WhatsApp Premium')}
      />
    </MotiView>
  )
}

const $banner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.indigo500,
  borderRadius: 16,
  padding: spacing.md,
  marginBottom: spacing.md,
  shadowColor: colors.palette.indigo500,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
})
