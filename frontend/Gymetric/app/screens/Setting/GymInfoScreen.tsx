import { Image, Platform, Pressable, ScrollView, View, ViewStyle } from 'react-native'
import React, { useState } from 'react'
import Toast from 'react-native-toast-message'
import { Camera, Clock, Dumbbell, FileText, Globe, Mail, MapPin, Phone, Receipt, UserRound } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { MenuRow, MenuSection } from '@/components/common/MenuRow'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { ThemedStyle } from '@/theme/types'
import { useAppTheme } from '@/theme/context'
import { api } from '@/services/Api'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { useImagePicker } from '@/utils/useImagePicker'

const FIELDS = ['name', 'ownerName', 'contactNumber', 'email', 'address', 'website', 'gstin', 'timings'] as const
type Field = (typeof FIELDS)[number]

const GymInfoScreen = () => {
  const { theme: { colors, spacing, isDark }, themed } = useAppTheme()
  const gym = useAppSelector(selectGymInfo)
  const [form, setForm] = useState<Record<Field, string>>(() =>
    Object.fromEntries(FIELDS.map((key) => [key, gym?.[key] != null ? String(gym[key]) : ''])) as Record<Field, string>,
  )
  const [logo, setLogo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { showImagePickerOptions, ImagePickerSheet } = useImagePicker()

  const set = (key: Field) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  const save = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Enter the gym name' })
      return
    }
    setSaving(true)
    let logoUrl = gym?.logo
    if (logo) {
      const upload = await api.uploadGymLogo(logo)
      if (upload.kind !== 'ok') {
        setSaving(false)
        return
      }
      logoUrl = upload.data.logo
    }
    const response = await api.updateGym({ id: gym?._id, ...form, logo: logoUrl })
    setSaving(false)
    if (response.kind === 'ok') {
      await api.gymInfo()
      Toast.show({ type: 'success', text1: 'Gym info saved' })
      goBack()
    }
  }

  const field = (key: Field, label: string, Icon: any, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField
      value={form[key]}
      onChangeText={set(key)}
      label={label}
      containerStyle={{ marginBottom: spacing.md }}
      autoCorrect={false}
      LeftAccessory={() => <Icon size={18} color={colors.textDim} style={{ marginLeft: spacing.sm, alignSelf: 'center' }} />}
      {...extra}
    />
  )

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={{ flex: 1 }}
      safeAreaEdges={['bottom']}
      {...(Platform.OS === 'android' ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Header title="Gym info" backgroundColor={colors.surface} leftIcon="caretLeft" onLeftPress={goBack} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => showImagePickerOptions(setLogo)} style={{ alignSelf: 'center', marginBottom: spacing.lg }}>
          <Image
            source={logo || gym?.logo ? { uri: logo || gym?.logo } : isDark ? require('@assets/images/app-icon-dark.png') : require('@assets/images/app-icon.png')}
            style={themed($logo)}
          />
          <View style={themed($cameraBadge)}>
            <Camera size={14} color={colors.white} />
          </View>
        </Pressable>

        {field('name', 'Gym name', Dumbbell, { autoCapitalize: 'words' })}
        {field('ownerName', 'Owner name', UserRound, { autoCapitalize: 'words' })}
        {field('contactNumber', 'Contact number', Phone, { keyboardType: 'phone-pad' })}
        {field('email', 'Email', Mail, { keyboardType: 'email-address', autoCapitalize: 'none' })}
        {field('address', 'Address', MapPin, { multiline: true })}
        {field('timings', 'Opening hours', Clock, { placeholder: 'e.g. 5:30 AM – 10:30 PM, Sunday closed' })}
        {field('website', 'Website', Globe, { autoCapitalize: 'none', keyboardType: 'url' })}
        {field('gstin', 'GSTIN', FileText, { autoCapitalize: 'characters', helper: 'Printed on receipts when filled' })}

        <Text size="xxs" weight="semiBold" style={{ color: colors.textDim, letterSpacing: 1, margin: 4 }} text="RECEIPTS" />
        <MenuSection>
          <MenuRow icon={Receipt} label="Receipt settings" description="Logo, signature, footer and share format" onPress={() => navigate('Receipt Settings')} />
        </MenuSection>
      </ScrollView>
      <View style={themed($footer)}>
        <Button title="Save changes" onPress={save} loading={saving} />
      </View>
      <ImagePickerSheet />
    </Screen>
  )
}

export default GymInfoScreen

const $logo: ThemedStyle<any> = ({ colors }) => ({
  width: 96,
  height: 96,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: colors.border,
})

const $cameraBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  bottom: -4,
  right: -4,
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: colors.background,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderTopWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
})
