import React, { forwardRef, useCallback, useImperativeHandle, useRef, useMemo } from 'react'
import { Pressable, View, ViewStyle, TextStyle } from 'react-native'
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { navigate } from '@/navigators/navigationUtilities'
import type { TopSellingPlanItem } from './TopSellingPlanCard'

export interface PlanSalesBottomSheetRef {
  present: () => void
  dismiss: () => void
}

interface PlanSalesBottomSheetProps {
  plans: TopSellingPlanItem[]
  totalSales: number
  totalRevenue: number
}

export const PlanSalesBottomSheet = forwardRef<PlanSalesBottomSheetRef, PlanSalesBottomSheetProps>(
  function PlanSalesBottomSheet({ plans, totalSales, totalRevenue }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null)
    const { bottom } = useSafeAreaInsets()
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const snapPoints = useMemo(() => ['55%', '85%'], [])

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }))

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      []
    )

    const handleManagePlans = () => {
      sheetRef.current?.dismiss()
      navigate('Memberships')
    }

    const ListHeader = () => (
      <View style={{ paddingBottom: spacing.md }}>
        <Text weight="bold" size="lg" style={{ color: colors.text }}>
          Plan sales · Last 6 months
        </Text>
        <Text size="xs" style={{ color: colors.textDim, marginTop: 4 }}>
          Includes new sign-ups and renewals
        </Text>
        <View style={[themed($summaryRow), { marginTop: spacing.md }]}>
          <View style={themed($summaryItem)}>
            <Text weight="bold" style={{ color: colors.text, fontSize: 18 }}>{totalSales}</Text>
            <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>sold</Text>
          </View>
          <View style={[themed($summaryDivider)]} />
          <View style={themed($summaryItem)}>
            <Text weight="bold" style={{ color: colors.text, fontSize: 18 }}>
              ₹{totalRevenue.toLocaleString('en-IN')}
            </Text>
            <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>total value</Text>
          </View>
        </View>
      </View>
    )

    const ListFooter = () => (
      <Pressable onPress={handleManagePlans} style={themed($footerBtn)}>
        <Text weight="semiBold" style={{ color: colors.primary }}>Manage membership plans</Text>
      </Pressable>
    )

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetFlatList
          data={plans}
          keyExtractor={(item) => item.planId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingBottom: bottom + spacing.lg,
          }}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          renderItem={({ item, index }) => (
            <View style={themed($row)}>
              <View style={themed($rankBadge)}>
                <Text weight="bold" size="xs" style={{ color: colors.primary }}>#{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={$rowTop}>
                  <Text weight="semiBold" style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
                    {item.planName}
                  </Text>
                  <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
                    <Text weight="bold" style={{ color: colors.text }}>
                      ₹{(item.revenue ?? 0).toLocaleString('en-IN')}
                    </Text>
                    <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>
                      avg ₹{(item.avgSaleAmount ?? 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
                <Text size="xs" style={{ color: colors.textDim, marginTop: 4 }}>
                  {item.count} sold · {item.sharePercent}%
                </Text>
                <View style={[themed($shareTrack), { marginTop: spacing.xs }]}>
                  <View
                    style={[
                      themed($shareFill),
                      { width: `${Math.min(item.sharePercent, 100)}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}
        />
      </BottomSheetModal>
    )
  }
)

const $summaryRow: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  backgroundColor: colors.background,
  borderRadius: 14,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: colors.border,
})
const $summaryItem: ThemedStyle<ViewStyle> = () => ({ flex: 1, alignItems: 'center' })
const $summaryDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 1,
  backgroundColor: colors.border,
  marginVertical: 4,
})
const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})
const $rankBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  backgroundColor: colors.primaryBackground,
  alignItems: 'center',
  justifyContent: 'center',
})
const $rowTop: ViewStyle = { flexDirection: 'row', alignItems: 'flex-start' }
const $shareTrack: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 4,
  borderRadius: 2,
  backgroundColor: colors.border,
  overflow: 'hidden',
})
const $shareFill: ThemedStyle<ViewStyle> = () => ({ height: '100%', borderRadius: 2 })
const $footerBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: 'center',
  paddingVertical: spacing.lg,
  marginTop: spacing.sm,
})
