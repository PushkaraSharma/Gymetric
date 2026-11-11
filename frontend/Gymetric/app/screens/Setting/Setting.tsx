import { Pressable, ScrollView, View, ViewStyle, TextStyle } from 'react-native'
import React, { useState } from 'react'
import Constants from 'expo-constants'
import { api } from '@/services/Api'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ChevronRight, CreditCard, FileText, MessageCircle } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { navigate } from '@/navigators/navigationUtilities'
import { ThemedStyle } from '@/theme/types'
import { Skeleton } from '@/components/Skeleton'
import { OTA_VERSION } from '@/utils/Constants'

const Setting = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const [hasWhatsapp, setHasWhatsapp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  React.useEffect(() => {
    const checkSettings = async () => {
      setIsLoading(true)
      const response = await api.getSettings()
      if (response.kind === 'ok' && response.data?.hasWhatsappConfigured) {
        setHasWhatsapp(true)
      } else {
        setHasWhatsapp(false)
      }
      setIsLoading(false)
    }
    checkSettings()
  }, [])

  const WhatsAppIcon = ({ size, color }: { size: number; color: string }) => (
    <Ionicons name="logo-whatsapp" size={size} color={color} />
  )

  const SettingItem = ({
    icon: Icon,
    label,
    description,
    onPress,
    color = colors.primary,
  }: {
    icon: any
    label: string
    description?: string
    onPress?: () => void
    color?: string
  }) => (
    <Pressable style={themed($item)} onPress={onPress}>
      <View style={$itemLeft}>
        <View style={[themed($itemIconBox), { backgroundColor: color + '15' }]}>
          <Icon size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={themed($itemLabel)} text={label} />
          {description && <Text size="xs" style={themed($itemDesc)} numberOfLines={1} text={description} />}
        </View>
      </View>
      <ChevronRight size={20} color={colors.textDim} />
    </Pressable>
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={themed($sectionTitle)} text={title} />
      <View style={themed($sectionContent)}>{children}</View>
    </View>
  )

  return (
    <Screen preset="fixed" safeAreaEdges={['top']} contentContainerStyle={themed($container)}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text preset="heading" style={themed($pageTitle)} text="Settings" />

        <Section title="MANAGEMENT">
          <SettingItem
            icon={CreditCard}
            label="Manage Membership"
            description="Plans, pricing and durations"
            onPress={() => navigate('Memberships')}
            color="#6366F1"
          />
          <SettingItem
            icon={FileText}
            label="Receipt Settings"
            description="Logo, signature and footer for payment receipts"
            onPress={() => navigate('Receipt Settings')}
            color="#6366F1"
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <SettingItem
            icon={MessageCircle}
            label="Push Notifications"
            description="Daily expiry and balance alerts"
            onPress={() => navigate('Push Notification Settings')}
            color="#4F46E5"
          />
          {isLoading ? (
            <View style={themed($item)}>
              <Skeleton width="100%" height={44} borderRadius={12} />
            </View>
          ) : hasWhatsapp ? (
            <>
              <SettingItem
                icon={WhatsAppIcon}
                label="WhatsApp Messages"
                description="Delivery status and message history"
                onPress={() => navigate('WhatsApp Messages')}
                color="#10B981"
              />
              <SettingItem
                icon={WhatsAppIcon}
                label="WhatsApp Settings"
                description="WhatsApp alerts and reminders"
                onPress={() => navigate('Notification Settings')}
                color="#10B981"
              />
            </>
          ) : (
            <SettingItem
              icon={WhatsAppIcon}
              label="Connect WhatsApp"
              description="Automate reminders & messages"
              onPress={() => navigate('WhatsApp Premium')}
              color="#10B981"
            />
          )}
        </Section>

        <Text
          weight="medium"
          style={themed($versionText)}
          text={`GymKarta v${Constants.expoConfig?.version}_${OTA_VERSION}`}
        />
      </ScrollView>
    </Screen>
  )
}

export default Setting

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  flex: 1,
})

const $pageTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  fontSize: 32,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing, typography }) => ({
  fontSize: 12,
  letterSpacing: 1,
  fontWeight: typography.semiBold,
  color: colors.textDim,
  marginBottom: spacing.xxs,
  marginLeft: 4,
})

const $sectionContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 20,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: colors.border,
})

const $item: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: spacing.sm + 2,
  paddingHorizontal: spacing.md,
})

const $itemLeft: ViewStyle = { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }
const $itemIconBox: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
})
const $itemLabel: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.semiBold,
  fontSize: 15,
  color: colors.text,
})
const $itemDesc: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim, marginTop: 2 })

const $versionText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: 'center',
  fontSize: 11,
  marginTop: spacing.lg,
})
