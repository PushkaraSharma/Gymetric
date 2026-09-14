import React, { useState } from 'react'
import { View, Dimensions, ViewStyle, TextStyle, Pressable } from 'react-native'
import { BarChart3 } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'

interface TrendItem {
  label: string
  amount: number
}

interface RevenueTrendChartProps {
  trends: TrendItem[]
}

const CHART_HEIGHT = 100
const AMOUNT_LABEL_HEIGHT = 22

export function RevenueTrendChart({ trends }: RevenueTrendChartProps) {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const visibleTrends = trends.filter(t => t.amount > 0)
  const maxVal = Math.max(...visibleTrends.map(t => t.amount), 1)
  const chartWidth = Dimensions.get('window').width - 64
  const barWidth = Math.min(28, (chartWidth - 40) / Math.max(visibleTrends.length, 1) - 8)
  const totalRevenue = visibleTrends.reduce((s, t) => s + t.amount, 0)
  const bestMonth = [...visibleTrends].sort((a, b) => b.amount - a.amount)[0]

  if (visibleTrends.length === 0) {
    return (
      <View style={themed($container)}>
        <Text style={themed($title)} text="Revenue Trends" />
        <View style={themed($emptyState)}>
          <View style={[themed($emptyIconBox), { backgroundColor: colors.primaryBackground }]}>
            <BarChart3 size={28} color={colors.primary} />
          </View>
          <Text style={themed($emptyTitle)} text="No Trends Yet" />
          <Text style={themed($emptyText)} text="Trends will appear after payments are recorded." />
        </View>
      </View>
    )
  }

  const toggleBar = (index: number) => {
    setSelectedIndex(prev => (prev === index ? null : index))
  }

  return (
    <View style={themed($container)}>
      <Text style={themed($title)} text="Last 6 Months" />
      <Text style={themed($hint)} text="Tap a bar for amount" />
      <View style={[themed($chartContainer), { height: CHART_HEIGHT + AMOUNT_LABEL_HEIGHT + 24 }]}>
        {visibleTrends.map((item, i) => {
          const barH = (item.amount / maxVal) * CHART_HEIGHT
          const gap = (chartWidth - visibleTrends.length * barWidth) / (visibleTrends.length + 1)
          const isSelected = selectedIndex === i
          return (
            <Pressable
              key={i}
              onPress={() => toggleBar(i)}
              style={{
                position: 'absolute',
                left: gap + i * (barWidth + gap),
                bottom: 0,
                alignItems: 'center',
                minWidth: barWidth + 8,
              }}
            >
              {isSelected && (
                <Text
                  style={themed($amountLabel)}
                  text={`₹${item.amount.toLocaleString('en-IN')}`}
                  numberOfLines={1}
                />
              )}
              {!isSelected && <View style={{ height: AMOUNT_LABEL_HEIGHT }} />}
              <View
                style={[
                  themed($bar),
                  {
                    width: isSelected ? barWidth + 4 : barWidth,
                    height: Math.max(barH, 4),
                    backgroundColor: isSelected ? colors.palette.indigo600 : colors.primary,
                    opacity: selectedIndex !== null && !isSelected ? 0.45 : 1,
                  },
                ]}
              />
              <Text style={themed($barLabel)} text={item.label} />
            </Pressable>
          )
        })}
      </View>
      <View style={themed($statsRow)}>
        <View style={themed($statItem)}>
          <Text style={themed($statValue)} text={`₹${(totalRevenue / 1000).toFixed(1)}K`} />
          <Text style={themed($statLabel)} text="6M Total" />
        </View>
        <View style={[themed($statItem), themed($statBorder)]}>
          <Text style={themed($statValue)} text={bestMonth?.label ?? '—'} />
          <Text style={themed($statLabel)} text="Best Month" />
        </View>
        <View style={themed($statItem)}>
          <Text style={themed($statValue)} text={String(visibleTrends.length)} />
          <Text style={themed($statLabel)} text="Months" />
        </View>
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 20,
  padding: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})
const $title: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.bold,
  fontSize: 16,
  color: colors.text,
})
const $hint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 11,
  color: colors.textDim,
  marginTop: 2,
  marginBottom: spacing.sm,
})
const $chartContainer: ThemedStyle<ViewStyle> = () => ({ position: 'relative', width: '100%' })
const $bar: ThemedStyle<ViewStyle> = () => ({ borderRadius: 6 })
const $amountLabel: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontSize: 10,
  fontWeight: typography.bold,
  color: colors.text,
  height: AMOUNT_LABEL_HEIGHT,
  textAlign: 'center',
})
const $barLabel: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 10, color: colors.textDim, marginTop: 6, fontWeight: '600' })
const $statsRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  backgroundColor: colors.background,
  borderRadius: 14,
  paddingVertical: spacing.sm,
  marginTop: spacing.xs,
})
const $statItem: ThemedStyle<ViewStyle> = () => ({ flex: 1, alignItems: 'center' })
const $statBorder: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border })
const $statValue: ThemedStyle<TextStyle> = ({ typography, colors }) => ({ fontSize: 16, fontWeight: typography.bold, color: colors.text })
const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 10, color: colors.textDim, marginTop: 2 })
const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({ alignItems: 'center', paddingVertical: spacing.lg })
const $emptyIconBox: ThemedStyle<ViewStyle> = ({ spacing }) => ({ width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md })
const $emptyTitle: ThemedStyle<TextStyle> = ({ typography, colors, spacing }) => ({ fontWeight: typography.bold, fontSize: 16, color: colors.text, marginBottom: spacing.xs })
const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 13, color: colors.textDim, textAlign: 'center', lineHeight: 20 })
