import { ActivityIndicator, Image, LayoutAnimation, Linking, Pressable, ScrollView, View, ViewStyle, TextStyle, Platform } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import Constants from 'expo-constants'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, ChevronLeft, FileText, HelpCircle, Key, LogOut, Moon, Phone, Sun, UserRound } from 'lucide-react-native'
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
import { OTA_VERSION } from '@/utils/Constants'
import { getInitials } from '@/utils/Helper'
import { useImagePicker } from '@/utils/useImagePicker'
import { trackEvent, AnalyticsEvents, setAnalyticsUser, setEnrichedUserProperties } from '@/services/analyticsService'
import { setCrashlyticsUser } from '@/services/crashlyticsService'

type Me = { name: string; phoneNumber: string; photo: string | null; roleName: string; gymName: string; hasPassword: boolean }

const MyProfileScreen = () => {
  const { theme: { colors, spacing, isDark }, themed, setThemeContextOverride, themeContext } = useAppTheme()
  const insets = useSafeAreaInsets()
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

  const logout = () => {
    trackEvent(AnalyticsEvents.SIGN_OUT)
    setAnalyticsUser(null)
    setCrashlyticsUser(null)
    remove('authToken')
    api.setAuthToken(undefined)
    setShowLogout(false)
  }

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
      >
        <View style={[themed($hero), { paddingTop: insets.top + spacing.xs }]}>
          <Pressable onPress={goBack} style={$backBtn} hitSlop={12}>
            <ChevronLeft size={26} color={colors.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Pressable onPress={changePhoto} style={themed($avatar)}>
              {me?.photo ? (
                <Image source={{ uri: me.photo }} style={$avatarImage} />
              ) : (
                <Text weight="bold" size="xl" style={{ color: colors.primary }} text={getInitials(me?.name || ' ')} />
              )}
              <View style={themed($cameraBadge)}>
                {uploading ? <ActivityIndicator size="small" color={colors.white} /> : <Camera size={14} color={colors.white} />}
              </View>
            </Pressable>
            <Text weight="bold" size="lg" style={{ marginTop: spacing.sm }} text={me?.name ?? ''} />
            <Text size="xs" style={{ color: colors.textDim }} text={me ? `${me.roleName} · ${me.gymName}` : ''} />
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          <MenuSection title="ACCOUNT">
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
            <MenuRow icon={Phone} label="Phone" description={me?.phoneNumber} divider />
            <MenuRow
              icon={Key}
              label={me?.hasPassword ? 'Change password' : 'Set a password'}
              description={me?.hasPassword ? undefined : 'Log in without waiting for an OTP'}
              onPress={() => navigate('Change Password')}
              color={colors.warning}
            />
          </MenuSection>

          <MenuSection title="APP">
            <MenuRow
              icon={isDark ? Sun : Moon}
              label="Dark mode"
              right={<Switch value={isDark} onValueChange={toggleTheme} />}
              divider
            />
            <MenuRow icon={HelpCircle} label="Help center" onPress={() => navigate('Help Center')} divider />
            <MenuRow icon={FileText} label="Terms of service" color={colors.textDim} onPress={() => Linking.openURL('https://gymkarta.indieroots.in/terms')} />
          </MenuSection>

          <Pressable style={themed($logout)} onPress={() => setShowLogout(true)}>
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

const $hero: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.primaryBackground,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
  marginBottom: spacing.lg,
})

const $backBtn: ViewStyle = { width: 40, height: 40, justifyContent: 'center' }

const $avatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 88,
  height: 88,
  borderRadius: 44,
  backgroundColor: colors.surface,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 3,
  borderColor: colors.surface,
})

const $avatarImage = { width: 82, height: 82, borderRadius: 41 }

const $cameraBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: colors.surface,
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
