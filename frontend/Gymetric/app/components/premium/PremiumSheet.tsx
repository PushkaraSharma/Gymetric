import React, { useCallback, useEffect, useRef } from 'react'
import { View, ViewStyle } from 'react-native'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, Crown, MessageCircle, Phone } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { FEATURE_PLAN, useViewer } from '@/utils/permissions'
import { contactSales, FEATURE_COPY, hidePremium, usePremiumRequest } from '@/utils/premium'

const PLAN_NAME = { pro: 'GymKarta Pro', max: 'GymKarta Max' } as const

// Mounted once in app.tsx. Opens whenever showPremium(feature) is called.
export function PremiumSheet() {
  const request = usePremiumRequest()
  const sheetRef = useRef<BottomSheetModal>(null)
  const { bottom } = useSafeAreaInsets()
  const { theme: { colors, spacing } } = useAppTheme()
  const gym = useAppSelector(selectGymInfo)
  const isOwner = useViewer().roleKey === 'owner'

  // Only ever present: the sheet closes itself and reports back through onDismiss. Calling dismiss() on a sheet that
  // was never shown leaves @gorhom/bottom-sheet marked as unmounting, and every later present() is dropped.
  useEffect(() => {
    if (request) sheetRef.current?.present()
  }, [request])

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />,
    [],
  )

  const feature = request?.feature
  const copy = feature ? FEATURE_COPY[feature] : null
  const plan = feature ? FEATURE_PLAN[feature] : 'pro'

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      onDismiss={hidePremium}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={{ paddingHorizontal: spacing.lg, paddingBottom: bottom + spacing.md }}>
        {copy ? (
          <>
            <View style={[$badge, { backgroundColor: colors.warningBackground }]}>
              <Crown size={14} color={colors.warning} strokeWidth={2.5} />
              <Text size="xs" weight="bold" style={{ color: colors.warning }} text={`Part of ${PLAN_NAME[plan]}`} />
            </View>
            <Text preset="subheading" weight="bold" style={{ marginTop: spacing.sm }} text={copy.title} />
            <Text size="sm" style={{ color: colors.textDim, marginTop: spacing.xxs }} text={copy.pitch} />
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {copy.points.map((point) => (
                <View key={point} style={$point}>
                  <View style={[$tick, { backgroundColor: colors.successBackground }]}>
                    <Check size={12} color={colors.success} strokeWidth={3} />
                  </View>
                  <Text size="sm" style={{ flex: 1 }} text={point} />
                </View>
              ))}
            </View>
            {isOwner ? (
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <Button
                  title="Talk to us on WhatsApp"
                  icon={<MessageCircle size={18} color="#FFFFFF" />}
                  onPress={() => contactSales({ gymName: gym?.name, feature, channel: 'whatsapp' })}
                />
                <Button
                  title="Call us"
                  variant="outline"
                  icon={<Phone size={18} color={colors.text} />}
                  onPress={() => contactSales({ gymName: gym?.name, feature, channel: 'call' })}
                />
                <Text size="xxs" style={{ color: colors.textDim, textAlign: 'center' }} text="We'll set it up for you. Free trial available." />
              </View>
            ) : (
              <Text
                size="sm"
                style={{ marginTop: spacing.lg, color: colors.textDim, textAlign: 'center' }}
                text="Ask your gym owner to switch this on."
              />
            )}
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const $badge: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  alignSelf: 'flex-start',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 999,
  marginTop: 4,
}

const $point: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 10 }

const $tick: ViewStyle = { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }
