import React, { useCallback, useState } from 'react'
import { FlatList, Pressable, View, ViewStyle } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import { useFocusEffect } from '@react-navigation/native'
import { addDays, format, isSameDay } from 'date-fns'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react-native'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import NoDataFound from '@/components/NoDataFound'
import DateTimePickerModal from 'react-native-modal-datetime-picker'

const AttendanceScreen = () => {
  const { theme: { colors }, themed } = useAppTheme()
  const [rows, setRows] = useState<any[]>([])
  const [date, setDate] = useState(new Date())
  const [showDate, setShowDate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'granted' | 'denied'>('all')

  const load = useCallback(async () => {
    const res = await api.listAttendance({
      date: format(date, 'yyyy-MM-dd'),
      status: filter === 'all' ? undefined : filter,
      limit: 100,
    })
    if (res.kind === 'ok') setRows(res.data?.rows || [])
  }, [date, filter])

  const statusColor = (s: string) => {
    if (s === 'granted' || s === 'manual') return '#22c55e'
    if (s === 'denied') return colors.error
    return colors.textDim
  }

  useFocusEffect(useCallback(() => { load() }, [load]))

  return (

    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header
        title="Attendance"
        leftIcon="back"
        safeAreaTop
        onLeftPress={goBack}
        RightActionComponent={
          <Pressable onPress={() => navigate('Attendance Trends')} style={{ marginRight: 8 }}>
            <BarChart3 size={22} color={colors.primary} />
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, alignSelf: 'flex-start', borderRadius: 10, borderColor: colors.border, paddingHorizontal: 10, backgroundColor: colors.surface }}>
          <Pressable onPress={() => setDate((d) => addDays(d, -1))} hitSlop={10}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Pressable style={themed($dateChip)} onPress={() => setShowDate(true)}>
            <Text size="sm" weight="semiBold">{format(date, 'dd MMM yyyy')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setDate((d) => addDays(d, 1))}
            hitSlop={10}
            disabled={isSameDay(date, new Date())}
            style={{ opacity: isSameDay(date, new Date()) ? 0.3 : 1 }}
          >
            <ChevronRight size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {(['all', 'granted', 'denied'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[themed($filterChip), filter === f && { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}
            >
              <Text size="xxs" weight="semiBold" style={{ textTransform: 'capitalize', color: filter === f ? colors.primary : colors.textDim }}>{f}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40, flexGrow: 1 }}
        ListEmptyComponent={<NoDataFound title="No check-ins" msg="Punches from the entrance device will show here" />}
        renderItem={({ item }) => {
          const client = item.clientId
          const name = client?.name || `PIN ${item.biometricPin}`
          return (
            <Pressable
              style={themed($row)}
              onPress={() => client?._id && navigate('Client Profile', { data: { _id: client._id } })}
            >
              <ProfileInitialLogo name={name} size={40} imageUrl={client?.profilePicture} sideMargin={false} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text weight="semiBold" size="sm">{name}</Text>
                <Text size="xs" style={{ color: colors.textDim }}>
                  {format(new Date(item.punchedAt), 'hh:mm a')} · {item.source}
                </Text>
              </View>
              <Text size="xxs" weight="bold" style={{ color: statusColor(item.status), textTransform: 'uppercase' }}>
                {item.status}
              </Text>
            </Pressable>
          )
        }}
      />

      <DateTimePickerModal
        isVisible={showDate}
        mode="date"
        date={date}
        maximumDate={new Date()}
        onConfirm={(d) => { setDate(d); setShowDate(false) }}
        onCancel={() => setShowDate(false)}
      />
    </Screen>
  )
}

const $dateChip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignSelf: 'flex-start',
  paddingHorizontal: 14,
  paddingVertical: 8,
})

const $filterChip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
})

const $row: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

export default AttendanceScreen
