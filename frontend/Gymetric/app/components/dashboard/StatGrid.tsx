import React from 'react'
import { Pressable, View, ViewStyle, TextStyle } from 'react-native'
import { TrendingUp } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { trackEvent, AnalyticsEvents } from '@/services/analyticsService'

export interface StatItem {
  label: string
  value: number | string
  trend?: number | null
  icon: React.ReactNode
  color: string
  filter?: string
}

interface StatGridProps {
  stats: StatItem[]
  onStatPress: (filter: string) => void
}

function StatCard({ label, value, trend, icon, color, onPress }: StatItem & { onPress: () => void }) {
  const { themed, theme: { colors } } = useAppTheme()
  return (
    <Pressable
      style={({ pressed }) => [themed($statCard), { opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
    >
      <View style={$statHeader}>
        <View style={[$iconContainer, { backgroundColor: color + '15' }]}>{icon}</View>
        {trend != null && (
          <View style={[$trendBadge, { backgroundColor: colors.successBackground }]}>
            <TrendingUp size={12} color={colors.success} />
            <Text size="xxs" style={{ color: colors.success, marginLeft: 4 }} text={`${trend}%`} />
          </View>
        )}
      </View>
      <Text style={themed($statValue)} text={String(value)} />
      <Text style={themed($statLabel)} text={label} />
    </Pressable>
  )
}

export function StatGrid({ stats, onStatPress }: StatGridProps) {
  const rows = [stats.slice(0, 2), stats.slice(2, 4)]

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={$statsGrid}>
          {row.map((stat) => (
            <StatCard
              key={stat.label}
              {...stat}
              onPress={() => {
                if (stat.filter) {
                  trackEvent(AnalyticsEvents.DASHBOARD_STAT_TAPPED, { stat: stat.label })
                  onStatPress(stat.filter)
                }
              }}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

const $statsGrid: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }
const $statCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  width: '48%',
  borderRadius: 20,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})
const $statHeader: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }
const $iconContainer: ViewStyle = { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }
const $trendBadge: ViewStyle = { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }
const $statValue: ThemedStyle<TextStyle> = ({ colors, typography }) => ({ fontSize: 24, fontWeight: typography.bold, color: colors.text, marginBottom: 4 })
const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 11, color: colors.textDim, letterSpacing: 0.3 })
