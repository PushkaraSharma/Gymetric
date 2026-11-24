import { Linking, Pressable, ScrollView, View, ViewStyle } from 'react-native'
import React, { useCallback, useState } from 'react'
import { useFocusEffect, useRoute } from '@react-navigation/native'
import { ChevronLeft, ChevronRight, Phone, Send, SquarePen } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { FingerprintCard } from '@/components/biometric/FingerprintCard'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { usePermission } from '@/utils/permissions'
import { formatShift, formatTimeOfDay, isoDay, isoMonth, WEEKDAYS_SHORT } from '@/utils/time'
import { shareInvite } from './StaffFormScreen'

type Day = { date: string; status: 'in' | 'out' | 'absent' | 'off'; late: boolean; punches: number; firstIn: string | null }

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

const shiftMonth = (month: string, by: number) => {
  const d = new Date(`${month}-01T00:00:00`)
  d.setMonth(d.getMonth() + by)
  return isoMonth(d)
}

const StaffProfileScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const { staffId } = useRoute<any>().params ?? {}
  const canManage = usePermission('staff.manage')
  const canPunch = usePermission('attendance.manage')
  const [person, setPerson] = useState<any | null>(null)
  const [month, setMonth] = useState(isoMonth())
  const [days, setDays] = useState<Day[] | null>(null)
  const [summary, setSummary] = useState<{ present: number; late: number; absent: number; off: number } | null>(null)
  const [punches, setPunches] = useState<any[]>([])

  const loadPerson = useCallback(async () => {
    const [info, today] = await Promise.all([api.getStaff(staffId), api.staffAttendance(staffId, isoDay())])
    if (info.kind === 'ok') setPerson(info.data)
    if (today.kind === 'ok') setPunches(today.data?.punches ?? [])
  }, [staffId])

  const loadMonth = useCallback(async () => {
    setDays(null)
    const response = await api.staffMonth(staffId, month)
    if (response.kind === 'ok') {
      setDays(response.data?.days ?? [])
      setSummary(response.data?.summary ?? null)
    } else setDays([])
  }, [staffId, month])

  useFocusEffect(useCallback(() => { loadPerson() }, [loadPerson]))
  useFocusEffect(useCallback(() => { loadMonth() }, [loadMonth]))

  const punch = async () => {
    const response = await api.addStaffPunch(staffId)
    if (response.kind === 'ok') { loadPerson(); loadMonth() }
  }

  const voidPunch = async (id: string) => {
    const response = await api.voidStaffPunch(id)
    if (response.kind === 'ok') { loadPerson(); loadMonth() }
  }

  const invite = async () => {
    const response = await api.staffInvite(staffId)
    if (response.kind === 'ok') shareInvite(response.data)
  }

  if (!person) {
    return (
      <Screen preset="fixed" safeAreaEdges={['bottom']}>
        <Header title="Staff" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <Skeleton width="100%" height={120} borderRadius={16} />
          <Skeleton width="100%" height={260} borderRadius={16} />
        </View>
      </Screen>
    )
  }

  const firstDay = new Date(`${month}-01T00:00:00`).getDay()
  const monthStart = new Date(`${month}-01T00:00:00`)
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  const byDate = new Map((days ?? []).map((d) => [d.date, d]))
  const isCurrentMonth = month === isoMonth()
  const dayColor = (day: Day) =>
    day.status === 'off' ? colors.palette.slate300
      : day.status === 'absent' ? colors.error
        : day.late ? colors.warning
          : colors.success

  return (
    <Screen preset="fixed" contentContainerStyle={{ flex: 1 }} safeAreaEdges={['bottom']}>
      <Header
        title="Staff"
        leftIcon="caretLeft"
        onLeftPress={goBack}
        RightActionComponent={canManage ? (
          <Pressable style={{ paddingHorizontal: spacing.md }} onPress={() => navigate('Staff Member', { staff: person })}>
            <SquarePen size={20} color={colors.text} />
          </Pressable>
        ) : undefined}
        backgroundColor={colors.surface}
        safeAreaTop
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
        <View style={themed($card)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ProfileInitialLogo name={person.name} size={56} sideMargin={false} />
            <View style={{ flex: 1 }}>
              <Text weight="bold" size="md" text={person.name} />
              <Text size="xs" style={{ color: colors.primary }} text={person.roleName} />
              <Text size="xxs" style={{ color: colors.textDim }} text={person.active ? person.phone : `${person.phone} · Login off`} />
            </View>
          </View>
          <View style={themed($metaRow)}>
            <Text size="xxs" style={{ color: colors.textDim }} text="SHIFTS" />
            <Text size="xs" text={(person.shifts ?? []).map(formatShift).join(', ') || 'No shift'} />
          </View>
          <View style={themed($metaRow)}>
            <Text size="xxs" style={{ color: colors.textDim }} text="WEEK OFF" />
            <Text size="xs" text={(person.weekOffs ?? []).map((d: number) => WEEKDAYS_SHORT[d]).join(', ') || 'None'} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
            <Pressable style={themed($action)} onPress={() => Linking.openURL(`tel:${person.phone}`)}>
              <Phone size={15} color={colors.primary} />
              <Text size="xs" weight="semiBold" style={{ color: colors.primary }} text="Call" />
            </Pressable>
            {canManage && (
              <Pressable style={themed($action)} onPress={invite}>
                <Send size={15} color={colors.primary} />
                <Text size="xs" weight="semiBold" style={{ color: colors.primary }} text="Send app link" />
              </Pressable>
            )}
          </View>
        </View>

        <FingerprintCard kind="staff" id={staffId} canEdit={canManage} />

        <View style={themed($card)}>
          <Text weight="semiBold" text="Today" />
          {punches.length === 0 ? (
            <Text size="xs" style={{ color: colors.textDim, marginTop: 4 }} text="No punches yet today." />
          ) : punches.map((item) => (
            <View key={item._id} style={themed($punch)}>
              <View>
                <Text
                  size="xs"
                  text={formatTimeOfDay(item.punchedAt)}
                  style={item.voidedAt ? { color: colors.textDim, textDecorationLine: 'line-through' } : undefined}
                />
                <Text size="xxs" style={{ color: colors.textDim }} text={item.source === 'device' ? 'Reader' : 'Manual'} />
              </View>
              {canPunch && !item.voidedAt && (
                <Pressable hitSlop={8} onPress={() => voidPunch(item._id)}>
                  <Text size="xs" style={{ color: colors.error }} text="Void" />
                </Pressable>
              )}
            </View>
          ))}
          {canPunch && <Button title="Record punch" variant="outline" onPress={punch} style={{ marginTop: spacing.sm }} />}
        </View>

        <View style={themed($card)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Pressable hitSlop={10} onPress={() => setMonth((m) => shiftMonth(m, -1))}>
              <ChevronLeft size={20} color={colors.text} />
            </Pressable>
            <Text weight="semiBold" style={{ flex: 1, textAlign: 'center' }} text={monthLabel(month)} />
            <Pressable hitSlop={10} disabled={isCurrentMonth} onPress={() => setMonth((m) => shiftMonth(m, 1))}>
              <ChevronRight size={20} color={isCurrentMonth ? colors.border : colors.text} />
            </Pressable>
          </View>
          {summary && (
            <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
              {[
                { label: 'Present', value: summary.present, color: colors.success },
                { label: 'Late', value: summary.late, color: colors.warning },
                { label: 'Absent', value: summary.absent, color: colors.error },
                { label: 'Off', value: summary.off, color: colors.textDim },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text weight="bold" style={{ color: item.color }} text={String(item.value)} />
                  <Text size="xxs" style={{ color: colors.textDim }} text={item.label} />
                </View>
              ))}
            </View>
          )}
          <View style={$week}>
            {WEEKDAYS_SHORT.map((d) => (
              <Text key={d} size="xxs" style={{ width: `${100 / 7}%`, textAlign: 'center', color: colors.textDim }} text={d[0]} />
            ))}
          </View>
          {days === null ? (
            <Skeleton width="100%" height={180} borderRadius={12} />
          ) : (
            <View style={$week}>
              {Array.from({ length: firstDay }).map((_, i) => <View key={`pad${i}`} style={$cell} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, '0')}`
                const day = byDate.get(date)
                return (
                  <View key={date} style={$cell}>
                    <View style={[themed($dot), { backgroundColor: day ? dayColor(day) : 'transparent' }]}>
                      <Text size="xxs" weight="semiBold" style={{ color: day ? colors.white : colors.textDim }} text={String(i + 1)} />
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

export default StaffProfileScreen

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
})

const $metaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.sm, gap: 2 })

const $action: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingVertical: 8,
  paddingHorizontal: spacing.sm,
  borderRadius: 999,
  backgroundColor: colors.primaryBackground,
})

const $punch: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $week: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap' }
const $cell: ViewStyle = { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 }
const $dot: ThemedStyle<ViewStyle> = () => ({
  width: 30,
  height: 30,
  borderRadius: 15,
  alignItems: 'center',
  justifyContent: 'center',
})
