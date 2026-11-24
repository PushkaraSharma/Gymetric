import { ActivityIndicator, Image, LayoutAnimation, Linking, Pressable, ScrollView, Share, View, ViewStyle, TextStyle, Platform } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import Constants from 'expo-constants'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import {
  Bell,
  Camera,
  ChevronLeft,
  Crown,
  FileText,
  HelpCircle,
  Key,
  LogOut,
  MessageCircle,
  Moon,
  Phone,
  Share2,
  Sun,
  UserRound,
} from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/Button'
import { Switch } from '@/components/Toggle/Switch'
import { MenuRow, MenuSection } from '@/components/common/MenuRow'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { ThemedStyle } from '@/theme/types'
import { api } from '@/services/Api'
import { remove } from '@/utils/LocalStorage'
import { OTA_VERSION, WEBSITE_URL } from '@/utils/Constants'
import { getInitials } from '@/utils/Helper'
import { useImagePicker } from '@/utils/useImagePicker'
import { useSubscription, useViewer } from '@/utils/permissions'
import { openSupportChat, PLAN_LABEL } from '@/utils/premium'
import { trackEvent, AnalyticsEvents, setAnalyticsUser, setEnrichedUserProperties } from '@/services/analyticsService'
import { setCrashlyticsUser } from '@/services/crashlyticsService'

type Me = { name: string; phoneNumber: string; photo: string | null; roleName: string; gymName: string; hasPassword: boolean }

// The logged-in person only (owner or staff). Gym details live on More, gym-wide setup in Settings.
const MyProfileScreen = () => {
  const { theme: { colors, spacing, isDark }, themed, setThemeContextOverride, themeContext } = useAppTheme()
  const insets = useSafeAreaInsets()
  const isOwner = useViewer().roleKey === 'owner'
  const subscription = useSubscription()
  const [me, setMe] = useState<Me | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const { showImagePickerOptions, ImagePickerSheet } = useImagePicker()

  const load = useCallback(async () => {
    const response = await api.getMe()
    if (response.kind === 'ok') {
      setMe(response.data)
      setName(response.data?.name ?? '')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveName = async () => {
    if (!name.trim()) return
    setSaving(true)
    const response = await api.updateMe({ name: name.trim() })
    setSaving(false)
    if (response.kind === 'ok') {
      setMe(response.data)
      setEditingName(false)
      Toast.show({ type: 'success', text1: 'Name updated' })
      api.gymInfo()
    }
  }

  const changePhoto = () =>
    showImagePickerOptions(async (uri) => {
      setUploading(true)
      const response = await api.uploadUserPhoto(uri)
      setUploading(false)
      if (response.kind === 'ok') {
        setMe((current) => (current ? { ...current, photo: response.data?.photo } : current))
        api.gymInfo()
      }
    })

  const toggleTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const nextDark = themeContext !== 'dark'
    setThemeContextOverride(nextDark ? 'dark' : 'light')
    setEnrichedUserProperties({ darkMode: nextDark })
    trackEvent(AnalyticsEvents.DARK_MODE_TOGGLED, { enabled: nextDark })
  }

  const shareApp = () =>
    Share.share({ message: `I run my gym on GymKarta: clients, renewals and payments in one app. ${WEBSITE_URL}` })

  const logout = () => {
    trackEvent(AnalyticsEvents.SIGN_OUT)
    setAnalyticsUser(null)
    setCrashlyticsUser(null)
    remove('authToken')
    api.setAuthToken(undefined)
    setShowLogout(false)
  }

  const planDescription =
    subscription.plan === 'free'
      ? 'See what WhatsApp and staff logins add'
      : subscription.expiresAt
        ? `Until ${format(parseISO(subscription.expiresAt), 'd MMM yyyy')}`
        : 'Active'

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['bottom']}
      contentContainerStyle={{ flex: 1 }}
      {...(Platform.OS === 'android' ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.palette.indigo400, colors.primary, colors.palette.indigo700]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[$hero, { paddingTop: insets.top + spacing.xs }]}
        >
          <Pressable onPress={goBack} style={$backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={26} color="#FFFFFF" />
          </Pressable>
          <View style={$identity}>
            <Pressable onPress={changePhoto} style={$avatar} accessibilityRole="button" accessibilityLabel="Change profile photo">
              {me?.photo ? (
                <Image source={{ uri: me.photo }} style={$avatarImage} />
              ) : (
                <Text weight="bold" size="xl" style={$white} text={getInitials(me?.name || ' ')} />
              )}
              <View style={[$cameraBadge, { backgroundColor: colors.palette.indigo700 }]}>
                {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Camera size={14} color="#FFFFFF" />}
              </View>
            </Pressable>
            <Text weight="bold" style={$heroName} numberOfLines={1} text={me?.name ?? ''} />
            {me ? (
              <View style={$roleChip}>
                <Text size="xxs" weight="semiBold" style={$white} text={me.roleName} />
              </View>
            ) : null}
            <Text size="sm" style={$heroGym} numberOfLines={1} text={me?.gymName ?? ''} />
          </View>
        </LinearGradient>

        <View style={themed($body)}>
          <MenuSection>
            {editingName ? (
              <View style={{ padding: spacing.md, gap: spacing.sm }}>
                <TextField label="Your name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => { setEditingName(false); setName(me?.name ?? '') }} />
                  <Button title="Save" style={{ flex: 1 }} loading={saving} onPress={saveName} />
                </View>
              </View>
            ) : (
              <MenuRow icon={UserRound} label="Name" description={me?.name} onPress={() => setEditingName(true)} divider />
            )}
            <MenuRow icon={Phone} label="Phone" description={me?.phoneNumber} color={colors.success} divider />
            <MenuRow
              icon={Key}
              label={me?.hasPassword ? 'Change password' : 'Set a password'}
              description={me?.hasPassword ? undefined : 'Log in without waiting for an OTP'}
              onPress={() => navigate('Change Password')}
              color={colors.warning}
            />
          </MenuSection>

          <MenuSection title="PREFERENCES">
            <MenuRow
              icon={isDark ? Sun : Moon}
              label="Dark mode"
              color={colors.palette.indigo500}
              right={<Switch value={isDark} onValueChange={toggleTheme} />}
              divider
            />
            <MenuRow
              icon={Bell}
              label="Notifications"
              description="Expiry, dues and daily summary alerts"
              onPress={() => navigate('Push Notification Settings')}
            />
          </MenuSection>

          {isOwner ? (
            <MenuSection title="YOUR PLAN">
              <MenuRow
                icon={Crown}
                label={PLAN_LABEL[subscription.plan]}
                description={planDescription}
                color={colors.warning}
                onPress={() => navigate('Plans')}
              />
            </MenuSection>
          ) : null}

          <MenuSection title="HELP">
            <MenuRow icon={HelpCircle} label="Help center" onPress={() => navigate('Help Center')} divider />
            <MenuRow icon={MessageCircle} label="Chat with us" description="WhatsApp the GymKarta team" color={colors.success} onPress={openSupportChat} divider />
            <MenuRow icon={Share2} label="Share GymKarta" description="Send the app to another gym owner" onPress={shareApp} divider />
            <MenuRow icon={FileText} label="Terms of service" color={colors.textDim} onPress={() => Linking.openURL(`${WEBSITE_URL}/terms`)} />
          </MenuSection>

          <Pressable style={themed($logout)} onPress={() => setShowLogout(true)} accessibilityRole="button">
            <LogOut size={20} color={colors.error} />
            <Text weight="semiBold" style={{ color: colors.error }} text="Log out" />
          </Pressable>
          <Text size="xxs" style={themed($version)} text={`GymKarta v${Constants.expoConfig?.version}_${OTA_VERSION}`} />
        </View>
      </ScrollView>
      <ImagePickerSheet />
      <ConfirmationModal
        visible={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={logout}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmText="Log out"
        cancelText="Cancel"
        variant="danger"
      />
    </Screen>
  )
}

export default MyProfileScreen

const $hero: ViewStyle = { paddingBottom: 56, paddingHorizontal: 16 }

const $backBtn: ViewStyle = { width: 40, height: 40, justifyContent: 'center' }

const $identity: ViewStyle = { alignItems: 'center', paddingTop: 4, paddingBottom: 8 }

const $avatar: ViewStyle = {
  width: 84,
  height: 84,
  borderRadius: 42,
  backgroundColor: 'rgba(255,255,255,0.22)',
  borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.45)',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
}

const $avatarImage = { width: 80, height: 80, borderRadius: 40 }

const $cameraBadge: ViewStyle = {
  position: 'absolute',
  bottom: -2,
  right: -2,
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: '#FFFFFF',
}

const $white: TextStyle = { color: '#FFFFFF' }

const $heroName: TextStyle = { color: '#FFFFFF', fontSize: 22 }

const $roleChip: ViewStyle = {
  marginTop: 6,
  paddingHorizontal: 10,
  paddingVertical: 3,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.2)',
}

const $heroGym: TextStyle = { color: 'rgba(255,255,255,0.85)', marginTop: 6 }

const $body: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  marginTop: -28,
  zIndex: 1,
})

const $logout: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  backgroundColor: colors.errorBackground,
  borderRadius: 16,
  padding: spacing.md,
})

const $version: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: 'center',
  marginTop: spacing.lg,
})
