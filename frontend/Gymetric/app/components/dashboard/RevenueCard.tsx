import React, { useState } from 'react'
import { Pressable, View, ViewStyle, TextStyle, Modal, TouchableWithoutFeedback } from 'react-native'
import { MotiView } from 'moti'
import { TrendingUp, Wallet, Info } from 'lucide-react-native'
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
  const trendText = trend !== null && trend !== undefined
    ? `${trend >= 0 ? '+' : ''}${trend}% vs last month`
    : 'No comparison data'

  return (
    <>
      <Pressable onPress={onPress}>
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={themed($card)}>
          <View style={$header}>
            <Text style={themed($label)} text="REVENUE THIS MONTH" />
            <Wallet size={22} color={colors.white} opacity={0.8} />
          </View>
          <Text style={themed($value)} text={`₹${value.toLocaleString()}`} />
          <View style={$footer}>
            <View style={$trendBadge}>
              <TrendingUp size={14} color={colors.white} />
              <Text style={themed($trendText)} size="xs" text={trendText} />
            </View>
          </View>
          {(todayCollection !== undefined || retentionRate !== undefined || avgRevenuePerMember !== undefined) && (
            <View style={[themed($statsRow), { marginTop: spacing.sm }]}>
              {todayCollection !== undefined && (
                <View style={themed($statItem)}>
                  <Text style={themed($statValue)} text={`₹${todayCollection.toLocaleString()}`} />
                  <Text style={themed($statLabel)} text="Today" />
                </View>
              )}
              {retentionRate !== undefined && (
                <View style={themed($statItem)}>
                  <View style={$statHeader}>
                    <Text style={themed($statValue)} text={`${retentionRate}%`} />
                    <Pressable onPress={() => setTooltipVisible('retention')} style={{ marginLeft: 4 }}>
                      <Info size={12} color="rgba(255,255,255,0.7)" />
                    </Pressable>
                  </View>
                  <Text style={themed($statLabel)} text="Retention" />
                </View>
              )}
              {avgRevenuePerMember !== undefined && (
                <View style={[themed($statItem), themed($statBorder)]}>
                  <View style={$statHeader}>
                    <Text style={themed($statValue)} text={`₹${avgRevenuePerMember}`} />
                    <Pressable onPress={() => setTooltipVisible('avgMember')} style={{ marginLeft: 4 }}>
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
              <Text weight="bold" style={{ color: colors.text, marginBottom: spacing.sm }}>Member Retention Rate</Text>
              <Text size="sm" style={{ color: colors.textDim, lineHeight: 20 }}>
                Percentage of members who renewed or maintained active memberships during this period. A higher retention rate indicates strong member satisfaction and loyalty.
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
              <Text weight="bold" style={{ color: colors.text, marginBottom: spacing.sm }}>Average Revenue Per Member</Text>
              <Text size="sm" style={{ color: colors.textDim, lineHeight: 20 }}>
                Total revenue divided by the number of active members. This metric helps you understand the average value each member generates for your gym.
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
const $label: ThemedStyle<TextStyle> = () => ({ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1, fontWeight: '700' })
const $value: ThemedStyle<TextStyle> = ({ typography }) => ({ color: '#FFFFFF', fontSize: 32, lineHeight: 40, fontWeight: typography.bold, marginBottom: 12 })
const $footer: ViewStyle = { flexDirection: 'row', alignItems: 'center' }
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
