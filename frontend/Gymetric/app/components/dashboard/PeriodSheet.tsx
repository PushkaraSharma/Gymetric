import React, { useCallback, useRef, useState } from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import DateTimePicker from 'react-native-ui-datepicker'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronRight,
  History,
  Sun,
} from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { ThemedStyle } from '@/theme/types'
import { customMaxDate, customMinDate, PeriodId, PeriodOption, rangeError } from '@/utils/periodRange'

const ICONS: Record<PeriodId, React.ComponentType<{ size: number; color: string }>> = {
  today: Sun,
  yesterday: History,
  last_7_days: CalendarRange,
  this_month: CalendarDays,
  last_month: Calendar,
  last_6_months: CalendarClock,
  custom: Calendar,
}

const asJsDate = (value: any): Date => {
  if (!value) return new Date()
  if (typeof value?.toDate === 'function') return value.toDate()
  return new Date(value)
}

const startOfDaySafe = (d: Date) => {
  const next = new Date(d)
  next.setHours(0, 0, 0, 0)
  return next
}

interface PeriodPickerProps {
  options: PeriodOption[]
  selectedId: PeriodId
  fromDate: Date
  toDate: Date
  onSelect: (id: PeriodId) => void
  onCustomRange: (from: Date, to: Date) => void
}

export function PeriodPicker({ options, selectedId, fromDate, toDate, onSelect, onCustomRange }: PeriodPickerProps) {
  const sheetRef = useRef<BottomSheetModal>(null)
  const { bottom } = useSafeAreaInsets()
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [startDate, setStartDate] = useState<Date>(fromDate)
  const [endDate, setEndDate] = useState<Date | null>(toDate)

  const triggerLabel = selectedId === 'custom'
    ? `${format(fromDate, 'd MMM')} - ${format(toDate, 'd MMM')}`
    : options.find((o) => o.id === selectedId)?.label ?? 'Period'

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    [],
  )

  const open = () => {
    setView('list')
    sheetRef.current?.present()
  }

  const choosePreset = (id: PeriodId) => {
    onSelect(id)
    sheetRef.current?.dismiss()
  }

  const openCalendar = () => {
    setStartDate(fromDate)
    setEndDate(toDate)
    setView('calendar')
  }

  const submit = () => {
    const start = startOfDaySafe(startDate)
    const end = startOfDaySafe(endDate || startDate)
    const err = rangeError(start, end)
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid range', text2: err })
      return
    }
    onCustomRange(start, end)
    onSelect('custom')
    sheetRef.current?.dismiss()
  }

  const row = (key: string, Icon: React.ComponentType<{ size: number; color: string }>, label: string, selected: boolean, onPress: () => void, trailing?: React.ReactNode) => (
    <Pressable key={key} onPress={onPress} style={themed($row)}>
      <View style={[themed($rowIcon), selected && { backgroundColor: colors.primaryBackground }]}>
        <Icon size={18} color={selected ? colors.primary : colors.textDim} />
      </View>
      <Text weight={selected ? 'semiBold' : 'normal'} style={{ flex: 1, color: selected ? colors.primary : colors.text }}>
        {label}
      </Text>
      {trailing ?? (selected ? <Check size={18} color={colors.primary} /> : null)}
    </Pressable>
  )

  return (
    <>
      <Pressable onPress={open} hitSlop={8} style={themed($pill)}>
        <Text size="xs" weight="semiBold" numberOfLines={1} style={{ color: colors.primary, flexShrink: 1 }}>{triggerLabel}</Text>
        <ChevronDown size={14} color={colors.primary} style={{ marginLeft: 4 }} />
      </Pressable>

      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        onDismiss={() => setView('list')}
      >
        <BottomSheetView style={{ paddingHorizontal: spacing.md, paddingBottom: bottom + spacing.sm }}>
          {view === 'list' ? (
            <>
              <Text weight="bold" size="lg" style={{ color: colors.text, marginBottom: spacing.xs }}>Select period</Text>
              {options.map((o) => row(o.id, ICONS[o.id], o.label, o.id === selectedId, () => choosePreset(o.id)))}
              {row(
                'custom',
                CalendarRange,
                selectedId === 'custom' ? `Custom · ${triggerLabel}` : 'Custom range',
                selectedId === 'custom',
                openCalendar,
                <ChevronRight size={18} color={colors.textDim} />,
              )}
            </>
          ) : (
            <>
              <View style={themed($fromToRow)}>
                <View style={themed($dateBox)}>
                  <Text size="xxs" weight="bold" style={{ color: colors.textDim }}>FROM</Text>
                  <Text size="sm" weight="semiBold" style={{ color: colors.primary, marginTop: 2 }}>
                    {format(startDate, 'dd MMM yyyy')}
                  </Text>
                </View>
                <View style={themed($dateBox)}>
                  <Text size="xxs" weight="bold" style={{ color: colors.textDim }}>TO</Text>
                  <Text size="sm" weight="semiBold" style={{ color: endDate ? colors.primary : colors.textDim, marginTop: 2 }}>
                    {endDate ? format(endDate, 'dd MMM yyyy') : 'Select date'}
                  </Text>
                </View>
              </View>

              <View style={themed($calendarBox)}>
                <DateTimePicker
                  mode="range"
                  startDate={startDate}
                  endDate={endDate || undefined}
                  minDate={customMinDate()}
                  maxDate={customMaxDate()}
                  onChange={(params: any) => {
                    if (params.startDate) setStartDate(asJsDate(params.startDate))
                    setEndDate(params.endDate ? asJsDate(params.endDate) : null)
                  }}
                  selectedItemColor={colors.primary}
                  selectedTextStyle={{ color: colors.white, fontWeight: '600' }}
                  todayContainerStyle={{ borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent', borderRadius: 12 }}
                  todayTextStyle={{ color: colors.primary, fontWeight: '600' }}
                  selectedRangeBackgroundColor={colors.primaryBackground}
                  headerButtonColor={colors.textDim}
                  headerTextStyle={{ color: colors.text, fontSize: 16, fontWeight: '600' }}
                  weekDaysTextStyle={{ fontSize: 12, color: colors.textDim, fontWeight: '500' }}
                  calendarTextStyle={{ fontSize: 16, color: colors.text }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setView('list')} />
                <Button title="Done" variant="primary" style={{ flex: 1 }} onPress={submit} />
              </View>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

const $pill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  maxWidth: 180,
  paddingVertical: 6,
  paddingHorizontal: spacing.sm,
  borderRadius: 18,
  backgroundColor: colors.surface,
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

const $rowIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  backgroundColor: colors.background,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
})

const $fromToRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  gap: spacing.sm,
  marginBottom: spacing.md,
  marginTop: spacing.xs,
})

const $dateBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  padding: spacing.sm,
  alignItems: 'center',
  justifyContent: 'center',
  height: 54,
})

const $calendarBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  padding: spacing.sm,
  marginBottom: spacing.md,
})
