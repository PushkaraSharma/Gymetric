import { Pressable, ScrollView, View, ViewStyle } from 'react-native'
import React, { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ChevronRight } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { usePermission } from '@/utils/permissions'
import { formatShift, WEEKDAYS_SHORT } from '@/utils/time'

const describe = (person: any) => {
  const shifts = (person.shifts ?? []).map(formatShift).join(', ') || 'No shift'
  const offs = (person.weekOffs ?? []).map((day: number) => WEEKDAYS_SHORT[day]).filter(Boolean)
  return `${shifts}${offs.length ? ` · Off ${offs.join(', ')}` : ''}`
}

const StaffScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const canManage = usePermission('staff.manage')
  const [people, setPeople] = useState<any[] | null>(null)

  const load = useCallback(async () => {
    const response = await api.listStaff()
    setPeople(response.kind === 'ok' ? response.data ?? [] : [])
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <Screen preset="fixed" contentContainerStyle={{ flex: 1 }} safeAreaEdges={['bottom']}>
      <Header title="Staff" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {people === null ? (
          <Skeleton width="100%" height={72} borderRadius={16} />
        ) : people.length === 0 ? (
          <View style={themed($empty)}>
            <Text weight="semiBold" text="No staff yet" />
            <Text size="xs" style={{ color: colors.textDim, marginTop: 4 }} text="Add your front desk, trainers or a manager. They log in with their own phone number." />
          </View>
        ) : (
          <View style={themed($list)}>
            {people.map((person, index) => (
              <Pressable
                key={person._id}
                style={[themed($row), index === people.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigate('Staff Profile', { staffId: person._id })}
              >
                <ProfileInitialLogo name={person.name} size={40} sideMargin={false} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text text={person.name} weight="semiBold" />
                    {!person.active ? <Text size="xxs" style={themed($offTag)} text="OFF" /> : null}
                  </View>
                  <Text size="xxs" style={{ color: colors.primary, marginTop: 1 }} text={person.roleName} />
                  <Text size="xxs" style={{ color: colors.textDim }} text={describe(person)} />
                </View>
                <ChevronRight size={18} color={colors.textDim} />
              </Pressable>
            ))}
          </View>
        )}
        {canManage && <Button title="Add staff" onPress={() => navigate('Staff Member', {})} style={{ marginTop: spacing.lg }} />}
      </ScrollView>
    </Screen>
  )
}

export default StaffScreen

const $empty: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 16,
  padding: spacing.md,
  backgroundColor: colors.surface,
})

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

const $offTag: ThemedStyle<any> = ({ colors }) => ({
  color: colors.error,
  backgroundColor: colors.errorBackground,
  paddingHorizontal: 6,
  borderRadius: 4,
  overflow: 'hidden',
})
