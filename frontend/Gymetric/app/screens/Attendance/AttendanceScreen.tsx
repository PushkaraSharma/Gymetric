import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View, ViewStyle } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Segmented } from '@/components/common/Segmented'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { usePermissions } from '@/utils/permissions'
import { formatTimeOfDay, isoDay } from '@/utils/time'

type Tab = 'clients' | 'staff'

type Checkin = { _id: string; memberId: string | null; name: string | null; punchedAt: string; status: 'granted' | 'denied'; denyReason: string | null }
type StaffDay = {
  staff: { _id: string; name: string; roleName?: string; photo?: string | null }
  status: 'in' | 'out' | 'absent' | 'off'
  late: boolean
  firstIn: string | null
  lastPunch: string | null
}
type Board = { counts: { in: number; out: number; absent: number; off: number; late: number }; staff: StaffDay[] }

const dayLabel = (date: Date) => {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

const AttendanceScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const can = usePermissions()
  const canClients = can('clients.view')
  const canStaff = can('staff.view') || can('attendance.manage')
  const canPunch = can('attendance.manage')
  const [tab, setTab] = useState<Tab>(canClients ? 'clients' : 'staff')
  const [date, setDate] = useState(() => new Date())
  const [checkins, setCheckins] = useState<Checkin[] | null>(null)
  const [board, setBoard] = useState<Board | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [punching, setPunching] = useState<string | null>(null)
  const isToday = date.toDateString() === new Date().toDateString()

  const load = useCallback(async () => {
    const day = isoDay(date)
    if (tab === 'clients') {
      const response = await api.checkins(day)
      setCheckins(response.kind === 'ok' ? response.data ?? [] : [])
    } else {
      const response = await api.staffBoard(day)
      if (response.kind === 'ok') setBoard(response.data)
    }
  }, [tab, date])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const shiftDay = (by: number) => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + by)
    if (next > new Date()) return
    setCheckins(null)
    setBoard(null)
    setDate(next)
  }

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const punch = async (row: StaffDay) => {
    setPunching(row.staff._id)
    const response = await api.addStaffPunch(row.staff._id)
    setPunching(null)
    if (response.kind === 'ok') {
      Toast.show({ type: 'success', text1: `${row.staff.name} punched ${row.status === 'in' ? 'out' : 'in'}` })
      load()
    }
  }

  const clientSummary = useMemo(() => {
    const list = checkins ?? []
    const granted = list.filter((c) => c.status === 'granted')
    return {
      visitors: new Set(granted.map((c) => c.memberId ?? c._id)).size,
      refused: list.filter((c) => c.status !== 'granted').length,
    }
  }, [checkins])

  const statusStyle = (row: StaffDay) => {
    if (row.status === 'in') return { label: row.late ? 'In · late' : 'In', fg: row.late ? colors.warning : colors.success, bg: row.late ? colors.warningBackground : colors.successBackground }
    if (row.status === 'out') return { label: 'Left', fg: colors.textDim, bg: colors.border }
    if (row.status === 'off') return { label: 'Week off', fg: colors.textDim, bg: colors.border }
    return { label: 'Absent', fg: colors.error, bg: colors.errorBackground }
  }

  const summary = tab === 'clients'
    ? [
        { label: 'Came in', value: clientSummary.visitors, color: colors.success },
        { label: 'Refused', value: clientSummary.refused, color: colors.error },
      ]
    : board
      ? [
          { label: 'In now', value: board.counts.in, color: colors.success },
          { label: 'Late', value: board.counts.late, color: colors.warning },
          { label: 'Absent', value: board.counts.absent, color: colors.error },
          { label: 'Left', value: board.counts.out, color: colors.textDim },
        ]
      : []

  const loading = tab === 'clients' ? checkins === null : board === null

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header title="Attendance" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm }}>
        {canClients && canStaff ? (
          <Segmented<Tab>
            options={[{ value: 'clients', label: 'Clients' }, { value: 'staff', label: 'Staff' }]}
            value={tab}
            onChange={setTab}
          />
        ) : null}
        <View style={$dateRow}>
          <Pressable onPress={() => shiftDay(-1)} hitSlop={12} style={themed($dateArrow)}>
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <Text weight="semiBold" text={dayLabel(date)} />
          <Pressable onPress={() => shiftDay(1)} hitSlop={12} style={[themed($dateArrow), { opacity: isToday ? 0.3 : 1 }]} disabled={isToday}>
            <ChevronRight size={20} color={colors.text} />
          </Pressable>
        </View>
        {!loading ? (
          <View style={themed($summary)}>
            {summary.map((item) => (
              <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text weight="bold" size="lg" style={{ color: item.color }} text={String(item.value)} />
                <Text size="xxs" style={{ color: colors.textDim }} text={item.label} />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : tab === 'clients' ? (
        <FlatList
          data={checkins ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={<Text size="xs" style={{ color: colors.textDim, textAlign: 'center', marginTop: spacing.lg }} text="No check-ins on this day." />}
          renderItem={({ item }) => {
            const granted = item.status === 'granted'
            return (
              <Pressable
                style={themed($row)}
                disabled={!item.memberId}
                onPress={() => item.memberId && navigate('Client Profile', { data: { _id: item.memberId } })}
              >
                <ProfileInitialLogo name={item.name || '?'} size={40} sideMargin={false} />
                <View style={{ flex: 1 }}>
                  <Text weight="semiBold" numberOfLines={1} text={item.name || 'Unknown finger'} />
                  <Text size="xxs" style={{ color: granted ? colors.textDim : colors.error }} numberOfLines={1} text={granted ? 'Door opened' : item.denyReason || 'Refused'} />
                </View>
                <Text size="xs" style={{ color: colors.textDim }} text={formatTimeOfDay(item.punchedAt)} />
              </Pressable>
            )
          }}
        />
      ) : (
        <FlatList
          data={board?.staff ?? []}
          keyExtractor={(item) => item.staff._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={<Text size="xs" style={{ color: colors.textDim, textAlign: 'center', marginTop: spacing.lg }} text="No active staff." />}
          renderItem={({ item }) => {
            const pill = statusStyle(item)
            return (
              <Pressable style={themed($row)} onPress={() => navigate('Staff Profile', { staffId: item.staff._id })}>
                <ProfileInitialLogo name={item.staff.name} imageUrl={item.staff.photo ?? undefined} size={40} sideMargin={false} />
                <View style={{ flex: 1 }}>
                  <Text weight="semiBold" numberOfLines={1} text={item.staff.name} />
                  <Text
                    size="xxs"
                    style={{ color: colors.textDim }}
                    text={item.firstIn ? `In ${formatTimeOfDay(item.firstIn)}${item.status === 'out' && item.lastPunch ? ` · out ${formatTimeOfDay(item.lastPunch)}` : ''}` : item.staff.roleName ?? ''}
                  />
                </View>
                {canPunch && isToday && item.status !== 'off' ? (
                  <Button
                    title={item.status === 'in' ? 'Punch out' : 'Punch in'}
                    variant="outline"
                    loading={punching === item.staff._id}
                    onPress={() => punch(item)}
                    style={themed($punchButton)}
                    textStyle={{ fontSize: 13 }}
                  />
                ) : (
                  <View style={[themed($pill), { backgroundColor: pill.bg }]}>
                    <Text size="xxs" weight="semiBold" style={{ color: pill.fg }} text={pill.label} />
                  </View>
                )}
              </Pressable>
            )
          }}
        />
      )}
    </Screen>
  )
}

export default AttendanceScreen

const $dateRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }

const $dateArrow: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
})

const $summary: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  paddingVertical: spacing.sm,
  borderRadius: 16,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
})

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $pill: ThemedStyle<ViewStyle> = () => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 })

const $punchButton: ThemedStyle<ViewStyle> = () => ({ minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 })
