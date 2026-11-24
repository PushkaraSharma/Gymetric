import { Alert, Linking, Platform, Pressable, ScrollView, Share, View, ViewStyle, TextStyle } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useRoute } from '@react-navigation/native'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { ChevronDown, Clock, Plus, X } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/Button'
import { Header } from '@/components/Header'
import { Switch } from '@/components/Toggle/Switch'
import { RoleOption, RoleSheet, RoleSheetRef } from '@/components/staff/RoleSheet'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { formatClock, fromHHmm, toHHmm } from '@/utils/time'

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MAX_SHIFTS = 3

type Shift = { start: string; end: string }

const displayPhone = (phone?: string) => (phone ?? '').replace(/^\+91/, '')

export const shareInvite = async (invite?: { phone: string; message: string }) => {
  if (!invite) return
  const digits = invite.phone.replace(/\D/g, '')
  try {
    await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(invite.message)}`)
  } catch {
    await Share.share({ message: invite.message })
  }
}

const StaffFormScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const existing = useRoute<any>().params?.staff
  const [name, setName] = useState(existing?.name ?? '')
  const [phone, setPhone] = useState(displayPhone(existing?.phone))
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [totalPermissions, setTotalPermissions] = useState(0)
  const [roleId, setRoleId] = useState<string | null>(existing?.roleId ?? null)
  const [shifts, setShifts] = useState<Shift[]>(existing?.shifts?.length ? existing.shifts : [{ start: '06:00', end: '14:00' }])
  const [weekOffs, setWeekOffs] = useState<number[]>(existing?.weekOffs ?? [])
  const [active, setActive] = useState(existing?.active !== false)
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState<{ index: number; field: 'start' | 'end' } | null>(null)
  const roleSheet = useRef<RoleSheetRef>(null)

  useEffect(() => {
    api.listRoles().then((response) => {
      if (response.kind !== 'ok') return
      const list: RoleOption[] = response.data?.roles ?? []
      setRoles(list)
      setTotalPermissions(response.data?.catalog?.length ?? 0)
      if (!existing) setRoleId((current) => current ?? list.find((r) => r.key === 'front_desk')?._id ?? null)
    })
  }, [existing])

  const selectedRole = roles.find((r) => r._id === roleId)

  const toggleOff = (day: number) => {
    setWeekOffs((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort())
  }

  const setShiftTime = (date: Date) => {
    if (!picker) return
    const value = toHHmm(date)
    setShifts((current) => current.map((s, i) => (i === picker.index ? { ...s, [picker.field]: value } : s)))
    setPicker(null)
  }

  const save = async () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) {
      Toast.show({ type: 'error', text1: 'Enter a name and a 10-digit phone number' })
      return
    }
    if (!roleId) {
      Toast.show({ type: 'error', text1: 'Choose a role' })
      return
    }
    if (password && password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' })
      return
    }
    const body: any = {
      name: name.trim(),
      phone,
      roleId,
      shifts,
      weekOffs,
      ...(existing ? { active } : {}),
      ...(password ? { password } : {}),
    }
    setSaving(true)
    const response = existing ? await api.updateStaff(existing._id, body) : await api.createStaff(body)
    setSaving(false)
    if (response.kind !== 'ok') return
    if (existing) {
      Toast.show({ type: 'success', text1: 'Staff updated' })
      goBack()
      return
    }
    Alert.alert(
      'Staff added',
      `Send ${name.trim().split(' ')[0]} the app link so they can log in with ${phone}?`,
      [
        { text: 'Later', style: 'cancel', onPress: goBack },
        { text: 'Send on WhatsApp', onPress: async () => { await shareInvite(response.data?.invite); goBack() } },
      ],
    )
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={{ flex: 1 }}
      safeAreaEdges={['bottom']}
      {...(Platform.OS === 'android' ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Header title={existing ? 'Edit staff' : 'Add staff'} leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <TextField label="Name" isRequired value={name} onChangeText={setName} containerStyle={themed($field)} />
        <TextField
          label="Phone"
          isRequired
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          helper="They log in to GymKarta with this number"
          containerStyle={themed($field)}
          LeftAccessory={() => <Text style={{ paddingLeft: 12, color: colors.textDim }}>+91</Text>}
        />

        <Text size="xxs" style={themed($label)} text="ROLE" />
        <Pressable style={themed($select)} onPress={() => roleSheet.current?.present()}>
          <View style={{ flex: 1 }}>
            <Text weight="semiBold" text={selectedRole?.name ?? 'Choose a role'} style={!selectedRole ? { color: colors.textDim } : undefined} />
            {selectedRole ? (
              <Text size="xxs" style={{ color: colors.textDim }} text={`${selectedRole.permissions.length} of ${totalPermissions} permissions`} />
            ) : null}
          </View>
          <ChevronDown size={18} color={colors.textDim} />
        </Pressable>

        <Text size="xxs" style={themed($label)} text="SHIFTS" />
        {shifts.map((shift, index) => (
          <View key={index} style={$shiftRow}>
            {(['start', 'end'] as const).map((field) => (
              <Pressable key={field} style={[themed($select), { flex: 1 }]} onPress={() => setPicker({ index, field })}>
                <Clock size={16} color={colors.textDim} />
                <View style={{ flex: 1 }}>
                  <Text size="xxs" style={{ color: colors.textDim }} text={field === 'start' ? 'Starts' : 'Ends'} />
                  <Text weight="semiBold" text={formatClock(shift[field])} />
                </View>
              </Pressable>
            ))}
            {shifts.length > 1 ? (
              <Pressable hitSlop={8} onPress={() => setShifts((current) => current.filter((_, i) => i !== index))}>
                <X size={18} color={colors.textDim} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {shifts.length < MAX_SHIFTS && (
          <Pressable style={$addShift} onPress={() => setShifts((current) => [...current, { start: '17:00', end: '21:00' }])}>
            <Plus size={16} color={colors.primary} />
            <Text size="xs" weight="semiBold" style={{ color: colors.primary }} text="Add shift" />
          </Pressable>
        )}

        <Text size="xxs" style={themed($label)} text="WEEK OFF" />
        <View style={$chips}>
          {WEEK.map((label, day) => {
            const selected = weekOffs.includes(day)
            return (
              <Pressable key={day} onPress={() => toggleOff(day)} style={[themed($day), selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text text={label} style={{ color: selected ? colors.white : colors.text }} />
              </Pressable>
            )
          })}
        </View>

        <Text size="xxs" style={themed($label)} text="LOGIN" />
        <TextField
          label={existing ? 'New password' : 'Password (optional)'}
          helper={existing ? 'Leave blank to keep the current one' : 'Without a password they log in with an OTP'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          containerStyle={themed($field)}
        />
        {existing && (
          <View style={themed($switchRow)}>
            <Switch
              label="Can log in"
              helper={active ? 'They can use the app' : 'Logged out and blocked'}
              value={active}
              onValueChange={setActive}
            />
          </View>
        )}

        <Button title={existing ? 'Save' : 'Add staff'} onPress={save} loading={saving} style={{ marginTop: spacing.lg }} />
      </ScrollView>

      <RoleSheet ref={roleSheet} roles={roles} selectedId={roleId} totalPermissions={totalPermissions} onSelect={(role) => setRoleId(role._id)} />
      <DateTimePickerModal
        isVisible={!!picker}
        mode="time"
        is24Hour={false}
        locale="en_US"
        date={picker ? fromHHmm(shifts[picker.index]?.[picker.field]) : new Date()}
        onConfirm={setShiftTime}
        onCancel={() => setPicker(null)}
      />
    </Screen>
  )
}

export default StaffFormScreen

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginBottom: spacing.sm })
const $label: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  letterSpacing: 1,
  marginTop: spacing.md,
  marginBottom: spacing.xs,
})
const $select: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
})
const $chips: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
const $day: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: colors.border,
})
const $shiftRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }
const $addShift: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }
const $switchRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
})
