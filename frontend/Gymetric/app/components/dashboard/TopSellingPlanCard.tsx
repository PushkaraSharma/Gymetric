import React, { useRef } from 'react'
import { View, Pressable, ViewStyle, TextStyle } from 'react-native'
import { Trophy, ChevronRight } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { PlanSalesBottomSheet, PlanSalesBottomSheetRef } from './PlanSalesBottomSheet'

export interface TopSellingPlanItem {
  planId: string
  planName: string
  count: number
  sharePercent: number
  revenue?: number
  avgSaleAmount?: number
}

interface TopSellingPlanCardProps {
  plans: TopSellingPlanItem[]
  totalSales: number
  totalRevenue: number
}

export function TopSellingPlanCard({ plans, totalSales, totalRevenue }: TopSellingPlanCardProps) {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const sheetRef = useRef<PlanSalesBottomSheetRef>(null)
  const top = plans[0]
  const runnerUp = plans[1]

  if (!top || totalSales === 0) return null

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        style={({ pressed }) => [themed($container), { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={$headerRow}>
          <View style={[themed($iconBox), { backgroundColor: colors.primaryBackground }]}>
            <Trophy size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={themed($label)} text="TOP SELLING PLAN · 6 MONTHS" />
            <Text style={themed($title)} text={top.planName} />
          </View>
          <ChevronRight size={20} color={colors.textDim} />
        </View>
        <Text
          style={themed($subtitle)}
          text={`${top.count} sold · ${top.sharePercent}% of sales`}
        />
        <Text style={themed($helper)} text="Includes new sign-ups and renewals" />
        {runnerUp && (
          <Text
            style={[themed($runnerUp), { marginTop: spacing.xs }]}
            text={`Next: ${runnerUp.planName} (${runnerUp.count})`}
          />
        )}
      </Pressable>

      <PlanSalesBottomSheet
        ref={sheetRef}
        plans={plans}
        totalSales={totalSales}
        totalRevenue={totalRevenue}
      />
    </>
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
const $headerRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12 }
const $iconBox: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
})
const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  letterSpacing: 0.8,
  fontWeight: '700',
  color: colors.textDim,
  marginBottom: 4,
})
const $title: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.bold,
  fontSize: 18,
  color: colors.text,
})
const $subtitle: ThemedStyle<TextStyle> = ({ typography, colors, spacing }) => ({
  fontSize: 14,
  fontWeight: typography.semiBold,
  color: colors.text,
  marginTop: spacing.sm,
})
const $helper: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: spacing.xs,
})
const $runnerUp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
})
