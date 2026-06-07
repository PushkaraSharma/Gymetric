import { Image, ImageStyle, LayoutAnimation, Linking, Pressable, ScrollView, Switch, View, ViewStyle, TextStyle } from 'react-native'
import React, { useCallback, useState } from 'react'
import Constants from 'expo-constants'
import { api } from '@/services/Api'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  FileText,
  MessageCircle,
  Key,
  Moon,
  Sun,
  LogOut,
  MapPin,
  User,
} from 'lucide-react-native'
import { navigate } from '@/navigators/navigationUtilities'
import { ThemedStyle } from '@/theme/types'
import { Skeleton } from '@/components/Skeleton'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { load, remove } from '@/utils/LocalStorage'
import { OTA_VERSION } from '@/utils/Constants'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { trackEvent, AnalyticsEvents, setAnalyticsUser, setEnrichedUserProperties } from '@/services/analyticsService'
import { setCrashlyticsUser } from '@/services/crashlyticsService'
const Setting = () => {
  const { theme: { colors, spacing, isDark }, themed, setThemeContextOverride, themeContext } = useAppTheme()
  const gymInfo = useAppSelector(selectGymInfo)
  const user: any = load('userData')
  const [hasWhatsapp, setHasWhatsapp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

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

  const toggleTheme = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const nextDark = themeContext !== 'dark'
    console.log("heheheh", nextDark, themeContext)
    setThemeContextOverride(nextDark ? 'dark' : 'light')
    setEnrichedUserProperties({ darkMode: nextDark })
    trackEvent(AnalyticsEvents.DARK_MODE_TOGGLED, { enabled: nextDark })
  }, [themeContext, setThemeContextOverride])

  const handleLogout = () => {
    trackEvent(AnalyticsEvents.SIGN_OUT)
    setAnalyticsUser(null)
    setCrashlyticsUser(null)
    remove('authToken')
    api.setAuthToken(undefined)
    setShowLogoutModal(false)
  }

  const SettingItem = ({
    icon: Icon,
    label,
    description,
    onPress,
    right,
    color = colors.primary,
  }: {
    icon: any
    label: string
    description?: string
    onPress?: () => void
    right?: React.ReactNode
    color?: string
  }) => (
    <Pressable style={themed($item)} onPress={onPress} disabled={!onPress && !right}>
      <View style={$itemLeft}>
        <View style={[themed($itemIconBox), { backgroundColor: color + '15' }]}>
          <Icon size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={themed($itemLabel)} text={label} />
          {description && <Text size="xs" style={themed($itemDesc)} numberOfLines={1} text={description} />}
        </View>
      </View>
      <View style={$itemRight}>
        {right ?? (onPress ? <ChevronRight size={20} color={colors.textDim} /> : null)}
      </View>
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

        <Pressable style={themed($profileCard)} onPress={() => navigate('Business Profile')}>
          <View style={themed($logoContainer)}>
            {gymInfo?.logo ? (
              <Image source={{ uri: gymInfo.logo }} style={$logo} resizeMode="cover" />
            ) : (
              <Image
                source={isDark ? require('@assets/images/app-icon-dark.png') : require('@assets/images/app-icon.png')}
                style={$logo}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={themed($gymName)} text={gymInfo?.name || 'GymKarta'} />
            <View style={$userRow}>
              <Text style={themed($username)} text={user?.username || 'Owner'} />
              <View style={themed($roleBadge)}>
                <Text style={themed($roleText)} text={user?.role || 'Admin'} />
              </View>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textDim} />
        </Pressable>

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
            <SettingItem
              icon={MessageCircle}
              label="WhatsApp Settings"
              description="WhatsApp alerts and reminders"
              onPress={() => navigate('Notification Settings')}
              color="#10B981"
            />
          ) : (
            <SettingItem
              icon={MessageCircle}
              label="Connect WhatsApp"
              description="Automate reminders & messages"
              onPress={() => navigate('WhatsApp Premium')}
              color="#10B981"
            />
          )}
        </Section>

        <Section title="APP PREFERENCES">
          <SettingItem
            icon={isDark ? Sun : Moon}
            label="Dark Mode"
            color="#8B5CF6"
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
        </Section>

        <Section title="SECURITY">
          <SettingItem
            icon={Key}
            label="Change Password"
            description="Update your account password"
            onPress={() => navigate('Change Password')}
            color="#F59E0B"
          />
        </Section>

        <Section title="SUPPORT">
          <SettingItem icon={HelpCircle} label="Help Center" onPress={() => navigate('Help Center')} color="#3B82F6" />
          <View style={themed($divider)} />
          <SettingItem
            icon={FileText}
            label="Terms of Service"
            onPress={() => Linking.openURL('https://gymkarta.indieroots.in/terms')}
            color="#64748B"
          />
        </Section>

        <Pressable style={themed($logoutBtn)} onPress={() => setShowLogoutModal(true)}>
          <LogOut size={20} color={colors.error} />
          <Text style={themed($logoutText)} text="Logout" />
        </Pressable>

        <Text
          weight='medium'
          style={themed($versionText)}
          text={`GymKarta v${Constants.expoConfig?.version}_${OTA_VERSION} • Made with ❤️`}
        />
      </ScrollView>

      <ConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Logout"
        message="Are you sure you want to logout from your account?"
        confirmText="Logout"
        cancelText="Cancel"
        variant="danger"
      />
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

const $profileCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.surface,
  borderRadius: 20,
  padding: spacing.md,
  marginBottom: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  gap: 12,
})

const $logoContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.background,
  borderWidth: 2,
  borderColor: colors.border,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
})

const $logo: ImageStyle = { width: '100%', height: '100%' }

const $gymName: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.semiBold,
  fontSize: 17,
  color: colors.text,
})

const $userRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6 }
const $username: ThemedStyle<TextStyle> = ({ typography, colors }) => ({ fontWeight: typography.medium, fontSize: 13, color: colors.text })

const $roleBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primaryBackground,
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 2,
})

const $roleText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 9,
  color: colors.primary,
  fontWeight: typography.bold,
  textTransform: 'uppercase',
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
const $itemRight: ViewStyle = { marginLeft: 8 }
const $itemIconBox: ThemedStyle<ViewStyle> = () => ({ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' })
const $itemLabel: ThemedStyle<TextStyle> = ({ typography, colors }) => ({ fontWeight: typography.semiBold, fontSize: 15, color: colors.text })
const $itemDesc: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim, marginTop: 2 })

const $divider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginHorizontal: 16,
})

const $logoutBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.errorBackground,
  borderRadius: 16,
  padding: spacing.md,
  marginTop: spacing.sm,
  gap: 10,
})

const $logoutText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.error,
  fontWeight: typography.semiBold,
  fontSize: 16,
})

const $versionText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: 'center',
  fontSize: 11,
  marginTop: spacing.lg,
})
