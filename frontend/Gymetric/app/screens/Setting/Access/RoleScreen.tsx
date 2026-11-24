import { Alert, Platform, ScrollView, View, ViewStyle } from 'react-native'
import React, { useMemo, useState } from 'react'
import { useRoute } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Switch } from '@/components/Toggle/Switch'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import type { PermissionInfo, RoleRow } from './AccessControlScreen'

const RoleScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const params = useRoute<any>().params ?? {}
  const role: RoleRow | undefined = params.role
  const catalog: PermissionInfo[] = params.catalog ?? []
  const locked = !!role?.locked
  const [name, setName] = useState(role?.name ?? '')
  const [granted, setGranted] = useState<string[]>(locked ? catalog.map((p) => p.key) : role?.permissions ?? [])
  const [saving, setSaving] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, PermissionInfo[]>()
    for (const p of catalog) map.set(p.group, [...(map.get(p.group) ?? []), p])
    return [...map.entries()]
  }, [catalog])

  const toggle = (key: string, on: boolean) =>
    setGranted((current) => (on ? [...new Set([...current, key])] : current.filter((k) => k !== key)))

  const save = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a role name' })
      return
    }
    setSaving(true)
    const body = { name: name.trim(), permissions: granted }
    const response = role ? await api.updateRole(role._id, body) : await api.createRole(body)
    setSaving(false)
    if (response.kind === 'ok') {
      Toast.show({ type: 'success', text1: role ? 'Role saved' : 'Role created' })
      goBack()
    }
  }

  const remove = () => {
    if (!role) return
    Alert.alert('Delete role?', `${role.name} will be removed. Staff on it must be moved first.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const response = await api.deleteRole(role._id)
          if (response.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Role deleted' })
            goBack()
          }
        },
      },
    ])
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={{ flex: 1 }}
      safeAreaEdges={['bottom']}
      {...(Platform.OS === 'android' ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Header title={role ? role.name : 'Create role'} leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {locked ? (
          <View style={themed($note)}>
            <Text size="xs" style={{ color: colors.textDim }} text="The Owner role always has full access, so nobody can lock the gym out." />
          </View>
        ) : (
          <TextField
            label="Role name"
            isRequired
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sales, Night shift"
            editable={!role?.isSystem || !locked}
            containerStyle={{ marginBottom: spacing.md }}
          />
        )}

        {groups.map(([group, items]) => (
          <View key={group} style={{ marginBottom: spacing.md }}>
            <Text size="xxs" style={{ color: colors.textDim, letterSpacing: 1, marginBottom: spacing.xs }} text={group.toUpperCase()} />
            <View style={themed($card)}>
              {items.map((item, index) => (
                <View key={item.key} style={[themed($row), index === items.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text size="xs" style={{ flex: 1, marginRight: spacing.md }} text={item.label} />
                  {locked ? (
                    <Text size="xxs" style={{ color: colors.success }} text="Allowed" />
                  ) : (
                    <Switch value={granted.includes(item.key)} onValueChange={(on) => toggle(item.key, on)} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {!locked && <Button title={role ? 'Save' : 'Create role'} onPress={save} loading={saving} style={{ marginTop: spacing.sm }} />}
        {role && !role.isSystem && (
          <Button title="Delete role" variant="outline" onPress={remove} style={{ marginTop: spacing.sm }} textStyle={{ color: colors.error }} />
        )}
      </ScrollView>
    </Screen>
  )
}

export default RoleScreen

const $card: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: 'hidden',
})

const $row: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
  minHeight: 48,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $note: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.primaryBackground,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.md,
})
