import { Pressable, ScrollView, View, ViewStyle } from 'react-native'
import React, { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ChevronRight, Lock } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'

export type RoleRow = {
  _id: string
  key: string | null
  name: string
  isSystem: boolean
  locked: boolean
  permissions: string[]
  people: number
}

export type PermissionInfo = { key: string; group: string; label: string }

const AccessControlScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const [roles, setRoles] = useState<RoleRow[] | null>(null)
  const [catalog, setCatalog] = useState<PermissionInfo[]>([])

  const load = useCallback(async () => {
    const response = await api.listRoles()
    if (response.kind === 'ok') {
      setRoles(response.data?.roles ?? [])
      setCatalog(response.data?.catalog ?? [])
    } else setRoles([])
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const summary = (role: RoleRow) => {
    if (role.locked) return 'Full access'
    const count = role.permissions.length
    const people = role.people === 1 ? '1 person' : `${role.people} people`
    return `${count} of ${catalog.length} permissions · ${people}`
  }

  return (
    <Screen preset="fixed" contentContainerStyle={{ flex: 1 }} safeAreaEdges={['bottom']}>
      <Header title="Access control" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.md }}>
          A role decides what a staff member can see and do. Pick the role when you add staff.
        </Text>
        {roles === null ? (
          <Skeleton width="100%" height={220} borderRadius={16} />
        ) : (
          <View style={themed($list)}>
            {roles.map((role, index) => (
              <Pressable
                key={role._id}
                style={[themed($row), index === roles.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigate('Role', { role, catalog })}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text text={role.name} weight="semiBold" />
                    {role.locked ? <Lock size={13} color={colors.textDim} /> : null}
                    {!role.isSystem ? <Text size="xxs" style={themed($customTag)} text="CUSTOM" /> : null}
                  </View>
                  <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }} text={summary(role)} />
                </View>
                <ChevronRight size={18} color={colors.textDim} />
              </Pressable>
            ))}
          </View>
        )}
        <Button title="Create role" onPress={() => navigate('Role', { catalog })} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </Screen>
  )
}

export default AccessControlScreen

const $list: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: 'hidden',
})

const $row: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $customTag: ThemedStyle<any> = ({ colors }) => ({
  color: colors.primary,
  backgroundColor: colors.primaryBackground,
  paddingHorizontal: 6,
  paddingVertical: 1,
  borderRadius: 4,
  overflow: 'hidden',
  letterSpacing: 0.5,
})
