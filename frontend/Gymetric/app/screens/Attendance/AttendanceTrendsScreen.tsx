import React, { useCallback, useState } from 'react'
import { ScrollView, View, ViewStyle } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import { useFocusEffect } from '@react-navigation/native'
import { format, parseISO } from 'date-fns'

const AttendanceTrendsScreen = () => {
  const { theme: { colors }, themed } = useAppTheme()
  const [data, setData] = useState<any>(null)

  const load = useCallback(async () => {
    const res = await api.attendanceTrends()
    if (res.kind === 'ok') setData(res.data)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const maxHour = Math.max(1, ...(data?.hourlyToday || []).map((h: any) => h.count))
  const maxDay = Math.max(1, ...(data?.last7Days || []).map((d: any) => d.count))
  const maxPeak = Math.max(1, ...(data?.peakHours || []).map((h: any) => h.count))

  return (
    <Screen preset="fixed"  contentContainerStyle={{ flex: 1 }}>
      <Header title="Crowd Trends" leftIcon="back" onLeftPress={goBack} safeAreaTop/>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={themed($statRow)}>
          <View style={themed($statCard)}>
            <Text size="xxs" style={{ color: colors.textDim }}>CHECK-INS TODAY</Text>
            <Text weight="bold" size="lg" style={{ marginTop: 4 }}>{data?.checkInsToday ?? '—'}</Text>
          </View>
          <View style={themed($statCard)}>
            <Text size="xxs" style={{ color: colors.textDim }}>BUSY NOW (2h)</Text>
            <Text weight="bold" size="lg" style={{ marginTop: 4 }}>{data?.busyNow ?? '—'}</Text>
          </View>
          <View style={themed($statCard)}>
            <Text size="xxs" style={{ color: colors.textDim }}>DENIED TODAY</Text>
            <Text weight="bold" size="lg" style={{ marginTop: 4, color: colors.error }}>{data?.deniedToday ?? '—'}</Text>
          </View>
        </View>

        <View style={themed($card)}>
          <Text weight="bold" size="sm" style={{ marginBottom: spacing.sm }}>Today by hour</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 }}>
            {(data?.hourlyToday || []).map((h: any) => (
              <View key={h.hour} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(2, (h.count / maxHour) * 100),
                    backgroundColor: h.count > 0 ? colors.primary : colors.border,
                    borderRadius: 2,
                  }}
                />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text size="xxs" style={{ color: colors.textDim }}>12a</Text>
            <Text size="xxs" style={{ color: colors.textDim }}>6a</Text>
            <Text size="xxs" style={{ color: colors.textDim }}>12p</Text>
            <Text size="xxs" style={{ color: colors.textDim }}>6p</Text>
          </View>
        </View>

        <View style={themed($card)}>
          <Text weight="bold" size="sm" style={{ marginBottom: spacing.sm }}>Last 7 days</Text>
          {(data?.last7Days || []).map((d: any) => (
            <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text size="xs" style={{ width: 72, color: colors.textDim }}>
                {format(parseISO(d.date), 'EEE d')}
              </Text>
              <View style={{ flex: 1, height: 10, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ width: `${(d.count / maxDay) * 100}%`, height: '100%', backgroundColor: colors.primary }} />
              </View>
              <Text size="xs" weight="semiBold" style={{ width: 28, textAlign: 'right' }}>{d.count}</Text>
            </View>
          ))}
        </View>

        <View style={themed($card)}>
          <Text weight="bold" size="sm" style={{ marginBottom: spacing.sm }}>Peak hours (7 days)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 }}>
            {(data?.peakHours || []).map((h: any) => (
              <View key={h.hour} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(2, (h.count / maxPeak) * 80),
                    backgroundColor: h.count > 0 ? '#22c55e' : colors.border,
                    borderRadius: 2,
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const $statRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  gap: 8,
  marginBottom: spacing.md,
})

const $statCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.sm,
})

const $card: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  marginBottom: spacing.md,
})

export default AttendanceTrendsScreen
