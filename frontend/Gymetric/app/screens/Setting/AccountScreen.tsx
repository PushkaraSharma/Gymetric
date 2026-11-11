import {
  LayoutAnimation,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native'
import React, { useCallback, useState } from 'react'
import Constants from 'expo-constants'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ChevronLeft, ChevronRight, HelpCircle, FileText, Key, LogOut, Moon, Sun, User } from 'lucide-react-native'
import { navigate, goBack } from '@/navigators/navigationUtilities'
import { ThemedStyle } from '@/theme/types'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { load, remove } from '@/utils/LocalStorage'
import { OTA_VERSION } from '@/utils/Constants'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { trackEvent, AnalyticsEvents, setAnalyticsUser, setEnrichedUserProperties } from '@/services/analyticsService'
import { setCrashlyticsUser } from '@/services/crashlyticsService'
import { api } from '@/services/Api'
import { getInitials } from '@/utils/Helper'

const AccountScreen = () => {
  const { theme: { colors, spacing, isDark }, themed, setThemeContextOverride, themeContext } = useAppTheme()
  const insets = useSafeAreaInsets()
  const gymInfo = useAppSelector(selectGymInfo)
  const user: any = load('userData')
  const ownerName = gymInfo?.ownerName || user?.username || 'Owner'
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const toggleTheme = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const nextDark = themeContext !== 'dark'
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
    showDivider,
  }: {
    icon: any
    label: string
    description?: string
    onPress?: () => void
    right?: React.ReactNode
    color?: string
    showDivider?: boolean
  }) => (
    <>
      <Pressable style={themed($item)} onPress={onPress} disabled={!onPress && !right}>
        <View style={$itemLeft}>
          <View style={[themed($itemIconBox), { backgroundColor: color + '15' }]}>
            <Icon size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={themed($itemLabel)} text={label} />
            {description ? (
              <Text size="xs" style={themed($itemDesc)} numberOfLines={1} text={description} />
            ) : null}
          </View>
        </View>
        <View style={$itemRight}>
          {right ?? (onPress ? <ChevronRight size={20} color={colors.textDim} /> : null)}
        </View>
      </Pressable>
      {showDivider ? <View style={themed($divider)} /> : null}
    </>
  )

  const gradientColors = [colors.palette.indigo400, colors.primary, colors.palette.indigo700] as const

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={$screen}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
      >
        <LinearGradient
          colors={[...gradientColors]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[$hero, { paddingTop: insets.top + spacing.xs }]}
        >
          <Pressable onPress={goBack} style={$backBtn} hitSlop={12}>
            <ChevronLeft size={26} color="#FFFFFF" />
          </Pressable>
          <View style={$heroIdentity}>
            <View style={$heroAvatar}>
              <Text weight="bold" size="lg" style={$heroInitials}>
                {getInitials(ownerName)}
              </Text>
            </View>
            <Text weight="bold" style={$heroName} text={ownerName} />
            <Text size="sm" style={$heroGym} text={gymInfo?.name || 'GymKarta'} />
          </View>
        </LinearGradient>

        <View style={themed($scrollBody)}>
        <View style={themed($actionCard)}>
          <SettingItem
            icon={User}
            label="Business Profile"
            description="Gym name, logo, address and contact"
            onPress={() => navigate('Business Profile')}
            color="#6366F1"
            showDivider
          />
          <SettingItem
            icon={isDark ? Sun : Moon}
            label="Dark Mode"
            color="#8B5CF6"
            showDivider
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
          <SettingItem
            icon={Key}
            label="Change Password"
            onPress={() => navigate('Change Password')}
            color="#F59E0B"
            showDivider
          />
          <SettingItem
            icon={HelpCircle}
            label="Help Center"
            onPress={() => navigate('Help Center')}
            color="#3B82F6"
            showDivider
          />
          <SettingItem
            icon={FileText}
            label="Terms of Service"
            onPress={() => Linking.openURL('https://gymkarta.indieroots.in/terms')}
            color="#64748B"
          />
        </View>

        <Pressable style={themed($logoutBtn)} onPress={() => setShowLogoutModal(true)}>
          <LogOut size={20} color={colors.error} />
          <Text style={themed($logoutText)} text="Logout" />
        </Pressable>

        <Text
          weight="medium"
          style={themed($versionText)}
          text={`GymKarta v${Constants.expoConfig?.version}_${OTA_VERSION}`}
        />
        </View>
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

export default AccountScreen

const $screen: ViewStyle = { flex: 1 }

const $hero: ViewStyle = {
  paddingBottom: 56,
  paddingHorizontal: 16,
}

const $backBtn: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: 'center',
}

const $heroIdentity: ViewStyle = {
  alignItems: 'center',
  paddingTop: 4,
  paddingBottom: 8,
}

const $heroAvatar: ViewStyle = {
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: 'rgba(255,255,255,0.22)',
  borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.45)',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
}

const $heroInitials: TextStyle = {
  color: '#FFFFFF',
}

const $heroName: TextStyle = {
  color: '#FFFFFF',
  fontSize: 22,
  marginTop: 0,
}

const $heroGym: TextStyle = {
  color: 'rgba(255,255,255,0.85)',
  marginTop: 2,
}

const $scrollBody: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  marginTop: -28,
  zIndex: 1,
})

const $actionCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 20,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 6,
})

const $item: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: spacing.sm + 4,
  paddingHorizontal: spacing.md,
})

const $itemLeft: ViewStyle = { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }
const $itemRight: ViewStyle = { marginLeft: 8 }
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
  marginTop: spacing.lg,
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
