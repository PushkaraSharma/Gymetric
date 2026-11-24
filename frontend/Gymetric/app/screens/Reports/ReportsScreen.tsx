import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View, ViewStyle, TextStyle } from 'react-native'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import Toast from 'react-native-toast-message'
import { CalendarRange, FileSpreadsheet, FileText } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { isoDay } from '@/utils/time'
import { Report, formatCell, shareReportCsv, shareReportPdf, summaryText } from '@/utils/reportExport'
import { useFeature } from '@/utils/permissions'
import { showPremium } from '@/utils/premium'
import { PlanChip } from '@/components/premium/PlanChip'

const KINDS = [
  { key: 'daybook', label: 'Day book' },
  { key: 'joiners-expiries', label: 'Joiners & expiries' },
  { key: 'freezes', label: 'Freezes' },
  { key: 'staff-attendance', label: 'Staff attendance' },
  { key: 'checkins', label: 'Check-ins' },
] as const

type Preset = 'today' | 'week' | 'month' | 'lastMonth' | 'custom'
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom', label: 'Custom' },
]

const presetRange = (preset: Exclude<Preset, 'custom'>) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'week':
      return { from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), to: today }
    case 'month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today }
    case 'lastMonth':
      return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 0) }
  }
}

const label = (date: Date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const ReportsScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const gym = useAppSelector(selectGymInfo)
  const [kind, setKind] = useState<(typeof KINDS)[number]['key']>('daybook')
  const [preset, setPreset] = useState<Preset>('month')
  const [range, setRange] = useState(() => presetRange('month'))
  const [picking, setPicking] = useState<'from' | 'to' | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  // Free: this month only, no export (the server enforces the same).
  const hasReports = useFeature('reports')

  const load = useCallback(async () => {
    const now = new Date()
    if (!hasReports && range.from < new Date(now.getFullYear(), now.getMonth(), 1)) {
      showPremium('reports', 'reports_range')
      setPreset('month')
      setRange(presetRange('month'))
      return
    }
    setLoading(true)
    const response = await api.report(kind, isoDay(range.from), isoDay(range.to))
    setLoading(false)
    setReport(response.kind === 'ok' ? response.data : null)
  }, [kind, range, hasReports])

  useEffect(() => { load() }, [load])

  const choosePreset = (next: Preset) => {
    setPreset(next)
    if (next === 'custom') setPicking('from')
    else setRange(presetRange(next))
  }

  const pickDate = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (picking === 'from') {
      setRange((current) => ({ from: day, to: current.to < day ? day : current.to }))
      setPicking(null)
      setTimeout(() => setPicking('to'), 400)
    } else {
      setRange((current) => ({ from: current.from > day ? day : current.from, to: day }))
      setPicking(null)
    }
  }

  const exportAs = async (format: 'csv' | 'pdf') => {
    if (!report) return
    if (!hasReports) {
      showPremium('reports', `reports_export_${format}`)
      return
    }
    if (report.rows.length === 0) {
      Toast.show({ type: 'info', text1: 'Nothing to export for these dates' })
      return
    }
    setExporting(format)
    try {
      if (format === 'csv') await shareReportCsv(report)
      else await shareReportPdf(report, gym?.name ?? 'GymKarta')
    } catch {
      Toast.show({ type: 'error', text1: 'Could not export the report' })
    }
    setExporting(null)
  }

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header title="Reports" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} stickyHeaderIndices={[0]}>
        <View style={themed($controls)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md }}>
            {KINDS.map((item) => (
              <Pressable key={item.key} onPress={() => setKind(item.key)} style={[themed($chip), kind === item.key && themed($chipActive)]}>
                <Text size="xs" weight="semiBold" style={{ color: kind === item.key ? colors.white : colors.text }} text={item.label} />
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
            {PRESETS.map((item) => (
              <Pressable key={item.key} onPress={() => choosePreset(item.key)} style={[themed($presetChip), preset === item.key && themed($presetActive)]}>
                <Text size="xxs" weight="semiBold" style={{ color: preset === item.key ? colors.primary : colors.textDim }} text={item.label} />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={themed($rangeRow)} onPress={() => { setPreset('custom'); setPicking('from') }}>
            <CalendarRange size={16} color={colors.textDim} />
            <Text size="xs" style={{ color: colors.textDim }} text={`${label(range.from)} – ${label(range.to)}`} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          {loading && !report ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : report ? (
            <>
              <View style={$summaryGrid}>
                {report.summary.map((item) => (
                  <View key={item.label} style={themed($summaryCard)}>
                    <Text size="xxs" style={{ color: colors.textDim }} numberOfLines={1} text={item.label} />
                    <Text weight="bold" size="md" numberOfLines={1} text={summaryText(item)} />
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md }}>
                <Button
                  title="PDF"
                  variant="outline"
                  style={{ flex: 1 }}
                  loading={exporting === 'pdf'}
                  onPress={() => exportAs('pdf')}
                  LeftAccessory={() => <FileText size={16} color={colors.text} style={{ marginRight: 6 }} />}
                  RightAccessory={hasReports ? undefined : () => <PlanChip feature="reports" style={{ marginLeft: 6 }} />}
                />
                <Button
                  title="CSV / Excel"
                  variant="outline"
                  style={{ flex: 1 }}
                  loading={exporting === 'csv'}
                  onPress={() => exportAs('csv')}
                  LeftAccessory={() => <FileSpreadsheet size={16} color={colors.text} style={{ marginRight: 6 }} />}
                  RightAccessory={hasReports ? undefined : () => <PlanChip feature="reports" style={{ marginLeft: 6 }} />}
                />
              </View>

              {report.rows.length === 0 ? (
                <Text size="xs" style={{ color: colors.textDim, textAlign: 'center', marginTop: spacing.lg }} text="Nothing recorded for these dates." />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={themed($table)}>
                    <View style={themed($headRow)}>
                      {report.columns.map((column) => (
                        <Text key={column.key} size="xxs" weight="semiBold" style={[$cell(column.type), { color: colors.textDim }]} text={column.label.toUpperCase()} />
                      ))}
                    </View>
                    {report.rows.slice(0, 300).map((row, index) => (
                      <View key={index} style={themed($bodyRow)}>
                        {report.columns.map((column) => (
                          <Text key={column.key} size="xxs" numberOfLines={2} style={$cell(column.type)} text={formatCell(column, row[column.key])} />
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
              {report.rows.length > 300 ? (
                <Text size="xxs" style={{ color: colors.textDim, marginTop: spacing.sm }} text={`Showing 300 of ${report.rows.length} rows. Export to see all.`} />
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>

      <DateTimePickerModal
        isVisible={picking !== null}
        mode="date"
        date={picking === 'to' ? range.to : range.from}
        maximumDate={new Date()}
        minimumDate={picking === 'to' ? range.from : undefined}
        onConfirm={pickDate}
        onCancel={() => setPicking(null)}
      />
    </Screen>
  )
}

export default ReportsScreen

const $cell = (type?: string): TextStyle => ({
  width: type === 'datetime' ? 130 : type === 'money' || type === 'number' ? 80 : 120,
  paddingHorizontal: 6,
  textAlign: type === 'money' || type === 'number' ? 'right' : 'left',
})

const $controls: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
})

const $chipActive: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.primary, borderColor: colors.primary })

const $presetChip: ThemedStyle<ViewStyle> = () => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 })

const $presetActive: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.primaryBackground })

const $rangeRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: spacing.md,
  marginTop: spacing.sm,
})

const $summaryGrid: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }

const $summaryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  minWidth: '31%',
  flexGrow: 1,
  padding: spacing.sm,
  borderRadius: 14,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
})

const $table: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  overflow: 'hidden',
})

const $headRow: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  paddingVertical: 8,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $bodyRow: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})
