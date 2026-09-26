import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { useFocusEffect } from '@react-navigation/native'

type Props = {
  clientId: string
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export const MemberAttendanceCalendar = ({ clientId }: Props) => {
  const { theme: { colors }, themed } = useAppTheme()
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [days, setDays] = useState<Record<string, number>>({})
  const [visitDays, setVisitDays] = useState(0)

  const load = useCallback(async () => {
    const res = await api.memberAttendanceHeatmap(clientId, format(month, 'yyyy-MM'))
    if (res.kind === 'ok') {
      setDays(res.data?.days || {})
      setVisitDays(res.data?.visitDays || 0)
    }
  }, [clientId, month])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const cells = useMemo(() => {
    const start = startOfWeek(startOfMonth(month))
    const end = endOfWeek(endOfMonth(month))
    return eachDayOfInterval({ start, end })
  }, [month])

  const canGoNext = isAfter(startOfMonth(new Date()), month)

  return (
    <View style={themed($card)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Pressable onPress={() => setMonth((m) => addMonths(m, -1))} hitSlop={10}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text weight="bold" size="sm">{format(month, 'MMM, yyyy')}</Text>
          <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>{visitDays} visit day{visitDays === 1 ? '' : 's'}</Text>
        </View>
        <Pressable
          onPress={() => canGoNext && setMonth((m) => addMonths(m, 1))}
          hitSlop={10}
          style={{ opacity: canGoNext ? 1 : 0.3 }}
        >
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAYS.map((d, i) => (
          <View key={`${d}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text size="xxs" style={{ color: colors.textDim }}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day) => {
          const inMonth = isSameMonth(day, month)
          const key = format(day, 'yyyy-MM-dd')
          const count = days[key] || 0
          const isFuture = isAfter(day, new Date())
          return (
            <View key={key} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: !inMonth || isFuture
                    ? 'transparent'
                    : count > 0
                      ? (count > 1 ? '#15803d' : '#22c55e')
                      : colors.border + '55',
                }}
              >
                <Text
                  size="xxs"
                  style={{
                    color: count > 0 ? '#fff' : inMonth ? colors.textDim : 'transparent',
                    fontWeight: count > 0 ? '700' : '400',
                  }}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  marginBottom: spacing.md,
})
