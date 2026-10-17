import { View, ViewStyle, ScrollView, Platform, Pressable, Dimensions } from 'react-native'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { api } from '@/services/Api'
import { useFocusEffect } from '@react-navigation/native'
import { Wallet, CreditCard, Banknote, Smartphone, ArrowDownLeft } from 'lucide-react-native'
import { format, parseISO, startOfWeek } from 'date-fns'
import { LineChart } from 'react-native-gifted-charts'
import { $styles } from '@/theme/styles'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { PeriodPicker } from '@/components/dashboard/PeriodSheet'
import { PeriodId, REVENUE_PERIODS, periodBounds } from '@/utils/periodRange'
import { useAppDispatch } from '@/redux/Hooks'
import { setLoading } from '@/redux/state/GymStates'

const screenWidth = Dimensions.get('window').width

const LABEL_WIDTH = 48
const INITIAL_SPACING = 12
const END_SPACING = 12
const MAX_DAILY_POINTS = 31

type ChartRow = { date: string; amount: number }
type Bucket = 'daily' | 'weekly' | 'monthly'

const bucketRows = (daily: ChartRow[]): { rows: ChartRow[]; bucket: Bucket } => {
  const months = new Set(daily.map((d) => d.date.slice(0, 7))).size
  if (daily.length <= MAX_DAILY_POINTS) return { rows: daily, bucket: 'daily' }
  const monthly = months >= 4
  const map = new Map<string, number>()
  for (const d of daily) {
    const date = parseISO(d.date)
    const key = monthly
      ? `${d.date.slice(0, 7)}-01`
      : format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    map.set(key, (map.get(key) || 0) + d.amount)
  }
  return {
    rows: [...map.entries()].map(([date, amount]) => ({ date, amount })),
    bucket: monthly ? 'monthly' : 'weekly',
  }
}

const labelOffset = (i: number, count: number, pointSpacing: number) => {
  const centered = (pointSpacing - LABEL_WIDTH) / 2
  if (i === 0) return Math.max(centered, pointSpacing / 2 - INITIAL_SPACING)
  if (i === count - 1) return Math.min(centered, END_SPACING + pointSpacing / 2 - LABEL_WIDTH)
  return centered
}

const toChartData = (rows: ChartRow[], textDim: string, pointSpacing: number, bucket: Bucket) => {
  const step = bucket === 'monthly' || rows.length <= 6 ? 1 : Math.ceil(rows.length / 5)
  return rows.map((row, i) => ({
    value: row.amount,
    date: row.date,
    labelComponent: i % step === 0
      ? () => (
          <Text
            numberOfLines={1}
            style={{
              width: LABEL_WIDTH,
              marginLeft: labelOffset(i, rows.length, pointSpacing),
              textAlign: 'center',
              fontSize: 11,
              color: textDim,
            }}
          >
            {format(parseISO(row.date), bucket === 'monthly' ? 'MMM' : 'd MMM')}
          </Text>
        )
      : undefined,
  }))
}

const Revenue = () => {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [periodId, setPeriodId] = useState<PeriodId>('this_month')
  const [customFrom, setCustomFrom] = useState<Date>()
  const [customTo, setCustomTo] = useState<Date>()
  const [stats, setStats] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [txPage, setTxPage] = useState(1)
  const [txHasMore, setTxHasMore] = useState(false)
  const [txLoading, setTxLoading] = useState(false)
  const dispatch = useAppDispatch()
  const loadedKey = useRef('')
  const bounds = useMemo(() => periodBounds(periodId, customFrom, customTo), [periodId, customFrom, customTo])

  const loadData = useCallback(async () => {
    const key = `${bounds.from}|${bounds.to}`
    const periodChanged = loadedKey.current !== key
    if (periodChanged) dispatch(setLoading({ loading: true }))
    try {
      const response = await api.dashboardRevenue(bounds.from, bounds.to)
      if (response.kind === 'ok') {
        setStats(response.data)
        setTransactions(response.data.transactions || [])
        setTxPage(response.data.page || 1)
        setTxHasMore(!!response.data.hasMore)
        loadedKey.current = key
      }
    } finally {
      if (periodChanged) dispatch(setLoading({ loading: false }))
    }
  }, [bounds.from, bounds.to, dispatch])

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  const loadMoreTransactions = async () => {
    if (!txHasMore || txLoading) return
    const key = `${bounds.from}|${bounds.to}`
    setTxLoading(true)
    try {
      const response = await api.dashboardRevenue(bounds.from, bounds.to, txPage + 1)
      if (loadedKey.current !== key) return
      if (response.kind === 'ok') {
        setTransactions((prev) => [...prev, ...(response.data.transactions || [])])
        setTxPage(response.data.page || txPage + 1)
        setTxHasMore(!!response.data.hasMore)
      }
    } finally {
      setTxLoading(false)
    }
  }

  // screen padding (md x2) + card padding (md left, xs right) + 1px border each side
  const chartWidth = screenWidth - spacing.md * 3 - spacing.xs - 2
  const { rows: chartRows, bucket } = useMemo(() => bucketRows(stats?.daily || []), [stats?.daily])
  const innerWidth = chartWidth - INITIAL_SPACING - END_SPACING
  const spacingPerPoint = chartRows.length > 1 ? innerWidth / (chartRows.length - 1) : innerWidth
  const chartData = useMemo(
    () => toChartData(chartRows, colors.textDim, spacingPerPoint, bucket),
    [chartRows, colors.textDim, spacingPerPoint, bucket],
  )

  const PaymentIcon = ({ method }: { method: string }) => {
    switch (method) {
      case 'UPI': return <Smartphone size={20} color={colors.palette.indigo500} />
      case 'Cash': return <Banknote size={20} color={colors.success} />
      case 'Card': return <CreditCard size={20} color={colors.error} />
      default: return <Wallet size={20} color={colors.primary} />
    }
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[$styles.flex1]}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Header
        title="Revenue"
        leftIcon="caretLeft"
        onLeftPress={goBack}
        backgroundColor={colors.surface}
        safeAreaTop
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm }}>
          <Text preset="heading" style={{ color: colors.text, flexShrink: 1 }}>
            ₹{(stats?.total || 0).toLocaleString('en-IN')}
          </Text>
          <PeriodPicker
            options={REVENUE_PERIODS}
            selectedId={periodId}
            fromDate={bounds.fromDate}
            toDate={bounds.toDate}
            onSelect={setPeriodId}
            onCustomRange={(from, to) => { setCustomFrom(from); setCustomTo(to) }}
          />
        </View>
        <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.md }}>
          {format(bounds.fromDate, 'd MMM yyyy')} - {format(bounds.toDate, 'd MMM yyyy')}
        </Text>

        <View style={themed($chartContainer)}>
          {chartData.length > 0 ? (
            <LineChart
              data={chartData}
              width={chartWidth}
              height={190}
              areaChart
              curved
              color={colors.primary}
              startFillColor={colors.primary}
              endFillColor={colors.primary}
              startOpacity={0.28}
              endOpacity={0.04}
              thickness={2.5}
              hideDataPoints={chartData.length > 12}
              spacing={spacingPerPoint}
              initialSpacing={INITIAL_SPACING}
              endSpacing={END_SPACING}
              hideYAxisText
              yAxisThickness={0}
              yAxisLabelWidth={0}
              yAxisColor="transparent"
              hideRules
              xAxisThickness={1}
              xAxisColor={colors.border}
              xAxisLabelsHeight={20}
              isAnimated={false}
              disableScroll
              pointerConfig={{
                pointerStripColor: colors.border,
                pointerStripWidth: 1,
                pointerStripUptoDataPoint: true,
                pointerColor: colors.primary,
                radius: 5,
                pointerLabelWidth: 110,
                pointerLabelHeight: 48,
                autoAdjustPointerLabelPosition: true,
                activatePointersInstantlyOnTouch: true,
                persistPointer: true,
                pointerLabelComponent: (items: { value: number; date?: string }[]) => {
                  const item = items[0]
                  if (!item?.date) return null
                  const day = format(parseISO(item.date), bucket === 'monthly' ? 'MMM yyyy' : 'd MMM')
                  return (
                    <View style={themed($tooltip)}>
                      <Text weight="bold" size="sm" style={{ color: colors.text }}>
                        ₹{item.value.toLocaleString('en-IN')}
                      </Text>
                      <Text size="xxs" style={{ color: colors.textDim }}>{bucket === 'weekly' ? `Week of ${day}` : day}</Text>
                    </View>
                  )
                },
              }}
            />
          ) : (
            <Text style={{ alignSelf: 'center', color: colors.textDim }}>No revenue data available</Text>
          )}
        </View>

        <Text preset="subheading" style={{ marginBottom: 15, marginTop: 25, color: colors.text }}>Payment Methods</Text>
        <View style={$methodsGrid}>
          {stats?.paymentMethods?.map((item: any, index: number) => (
            <View key={index} style={themed($methodCard)}>
              <View style={$methodHeader}>
                <PaymentIcon method={item.method} />
                <Text weight="bold" size="lg" style={{ color: colors.text }}>{item.count}</Text>
              </View>
              <Text size="xs" style={{ color: colors.textDim, marginTop: 5 }}>{item.method}</Text>
              <Text weight="bold" size="md" style={{ color: colors.text, marginTop: 2 }}>₹{(item.amount).toLocaleString('en-IN')}</Text>
            </View>
          ))}
          {(!stats?.paymentMethods || stats?.paymentMethods.length === 0) && (
            <Text style={{ color: colors.textDim }}>No payments in this period</Text>
          )}
        </View>

        <Text preset="subheading" style={{ marginBottom: 15, marginTop: 25, color: colors.text }}>Transactions</Text>
        <View>
          {transactions.map((item: any, index: number) => (
            <Pressable
              key={index}
              style={themed($transactionItem)}
              onPress={() => item.clientId && navigate('Client Profile', { data: { _id: item.clientId, name: item.clientName } })}
            >
              <View style={$transactionLeft}>
                <View style={[themed($iconBox), { backgroundColor: colors.palette.indigo100 }]}>
                  <ArrowDownLeft size={20} color={colors.palette.indigo600} />
                </View>
                <View>
                  <Text weight="semiBold" style={{ color: colors.text }}>{item.clientName}</Text>
                  <Text size="xs" style={{ color: colors.textDim }}>{format(new Date(item.date), 'dd MMM, hh:mm a')}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text weight="bold" style={{ color: colors.success }}>+₹{item.amount}</Text>
                <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>{item.method}</Text>
              </View>
            </Pressable>
          ))}
          {transactions.length === 0 && (
            <Text style={{ color: colors.textDim }}>No transactions in this period</Text>
          )}
          {txHasMore && (
            <Pressable onPress={loadMoreTransactions} disabled={txLoading} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text weight="semiBold" style={{ color: colors.primary }}>{txLoading ? 'Loading…' : 'Load more'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

export default Revenue

const $chartContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  padding: spacing.md,
  paddingRight: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 220,
  justifyContent: 'center',
  overflow: 'hidden',
})

const $tooltip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 10,
  paddingVertical: 6,
  alignItems: 'center',
})

const $methodsGrid: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
}

const $methodCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  width: '48%',
  padding: spacing.md,
  borderRadius: 16,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
})

const $methodHeader: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const $transactionItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $transactionLeft: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
}

const $iconBox: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
})
