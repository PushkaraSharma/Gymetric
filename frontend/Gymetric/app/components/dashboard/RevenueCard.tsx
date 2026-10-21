import React, { useState } from 'react'
import { Pressable, View, ViewStyle, TextStyle, Modal, TouchableWithoutFeedback } from 'react-native'
import { MotiView } from 'moti'
import { TrendingUp, TrendingDown, Wallet, Info, ChevronRight } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'

interface RevenueCardProps {
  value: number
  trend: number | null
  retentionRate?: number
  avgRevenuePerMember?: number
  todayCollection?: number
  onPress: () => void
}

export function RevenueCard({ value, trend, retentionRate, avgRevenuePerMember, todayCollection, onPress }: RevenueCardProps) {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [tooltipVisible, setTooltipVisible] = useState<'retention' | 'avgMember' | null>(null)
  const trendText = `${trend != null && trend >= 0 ? '+' : ''}${trend}% vs same days last month`

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={themed($card)}>
          <View style={$header}>
            <Text style={themed($label)} text="REVENUE THIS MONTH" />
            <View style={$headerIcons}>
              <Wallet size={22} color={colors.white} opacity={0.8} />
              <ChevronRight size={20} color={colors.white} opacity={0.9} />
            </View>
          </View>
          <Text style={themed($value)} text={`₹${value.toLocaleString('en-IN')}`} />
          <View style={$footer}>
            {trend != null && (
              <View style={$trendBadge}>
                {trend < 0
                  ? <TrendingDown size={14} color={colors.white} />
                  : <TrendingUp size={14} color={colors.white} />}
                <Text style={themed($trendText)} size="xs" text={trendText} />
              </View>
            )}
            <Text style={themed($viewBreakdown)} text="View breakdown" />
          </View>
          {(todayCollection !== undefined || retentionRate !== undefined || avgRevenuePerMember !== undefined) && (
            <View style={[themed($statsRow), { marginTop: spacing.sm }]}>
              {todayCollection !== undefined && (
                <View style={themed($statItem)}>
                  <Text style={themed($statValue)} text={`₹${todayCollection.toLocaleString('en-IN')}`} />
                  <Text style={themed($statLabel)} text="Today" />
                </View>
              )}
              {retentionRate !== undefined && (
                <View style={[themed($statItem), themed($statBorder)]}>
                  <View style={$statHeader}>
                    <Text style={themed($statValue)} text={`${retentionRate}%`} />
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); setTooltipVisible('retention') }}
                      style={{ marginLeft: 4 }}
                    >
                      <Info size={12} color="rgba(255,255,255,0.7)" />
                    </Pressable>
                  </View>
                  <Text style={themed($statLabel)} text="Retention" />
                </View>
              )}
              {avgRevenuePerMember !== undefined && (
                <View style={[themed($statItem)]}>
                  <View style={$statHeader}>
                    <Text style={themed($statValue)} text={`₹${avgRevenuePerMember}`} />
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); setTooltipVisible('avgMember') }}
                      style={{ marginLeft: 4 }}
                    >
                      <Info size={12} color="rgba(255,255,255,0.7)" />
                    </Pressable>
                  </View>
                  <Text style={themed($statLabel)} text="Avg / Member" />
                </View>
              )}
            </View>
          )}
        </MotiView>
      </Pressable>

      {/* Retention Tooltip */}
      <Modal transparent visible={tooltipVisible === 'retention'} animationType="fade" onRequestClose={() => setTooltipVisible(null)}>
        <TouchableWithoutFeedback onPress={() => setTooltipVisible(null)}>
          <View style={$tooltipOverlay}>
            <View style={themed($tooltipBox)}>
              <Text weight="bold" style={{ color: colors.text, marginBottom: spacing.sm }}>30-day renewal rate</Text>
              <Text size="sm" style={{ color: colors.textDim, lineHeight: 20 }}>
                Of memberships that ended in the last 30 days, the share of those members who are now active, on a future plan, or already assigned a newer membership.
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Avg Revenue Per Member Tooltip */}
      <Modal transparent visible={tooltipVisible === 'avgMember'} animationType="fade" onRequestClose={() => setTooltipVisible(null)}>
        <TouchableWithoutFeedback onPress={() => setTooltipVisible(null)}>
          <View style={$tooltipOverlay}>
            <View style={themed($tooltipBox)}>
              <Text weight="bold" style={{ color: colors.text, marginBottom: spacing.sm }}>Average ticket this month</Text>
              <Text size="sm" style={{ color: colors.textDim, lineHeight: 20 }}>
                Average collected per paying member this month.
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.indigo600,
  borderRadius: 20,
  padding: spacing.md,
  shadowColor: colors.palette.indigo600,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 8,
})

const $header: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
const $headerIcons: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6 }
const $viewBreakdown: ThemedStyle<TextStyle> = () => ({ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginLeft: 10 })
const $label: ThemedStyle<TextStyle> = () => ({ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1, fontWeight: '700' })
const $value: ThemedStyle<TextStyle> = ({ typography }) => ({ color: '#FFFFFF', fontSize: 32, lineHeight: 40, fontWeight: typography.bold, marginBottom: 12 })
const $footer: ViewStyle = { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }
const $trendBadge: ViewStyle = { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }
const $trendText: ThemedStyle<TextStyle> = ({ typography }) => ({ color: '#FFFFFF', marginLeft: 4, fontWeight: typography.medium, fontSize: 12 })
const $statsRow: ThemedStyle<ViewStyle> = () => ({ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 10 })
const $statItem: ThemedStyle<ViewStyle> = () => ({ flex: 1, alignItems: 'center' })
const $statBorder: ThemedStyle<ViewStyle> = () => ({ borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' })
const $statValue: ThemedStyle<TextStyle> = ({ typography }) => ({ color: '#FFFFFF', fontSize: 16, fontWeight: typography.bold })
const $statLabel: ThemedStyle<TextStyle> = () => ({ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 })
const $statHeader: ViewStyle = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }
const $tooltipOverlay: ViewStyle = { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }
const $tooltipBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.background, borderRadius: 16, padding: spacing.lg, maxWidth: 320 })
