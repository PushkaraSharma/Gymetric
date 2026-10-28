import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Pressable, View, ViewStyle, TextStyle } from 'react-native'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronRight } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import { GenderFilter } from '@/utils/clientFilters'
import { ThemedStyle } from '@/theme/types'
import { Button } from '@/components/Button'

const GENDERS: GenderFilter[] = ['All', 'Male', 'Female', 'Other']

export type MembersFilterSheetRef = { present: () => void }

type Props = {
  planOptions: string[]
  selectedPlans: string[]
  gender: GenderFilter
  onApply: (plans: string[], gender: GenderFilter) => void
}

const planSummary = (selected: string[]) => {
  if (!selected.length) return 'All plans'
  return selected[0]
}

export const MembersFilterSheet = forwardRef<MembersFilterSheetRef, Props>(function MembersFilterSheet(
  { planOptions, selectedPlans, gender, onApply },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null)
  const { bottom } = useSafeAreaInsets()
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [draftPlans, setDraftPlans] = useState<string[]>(selectedPlans)
  const [draftGender, setDraftGender] = useState<GenderFilter>(gender)
  const [planPickerOpen, setPlanPickerOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    present: () => {
      setDraftPlans(selectedPlans)
      setDraftGender(gender)
      setPlanPickerOpen(false)
      sheetRef.current?.present()
    },
  }))

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    [],
  )

  const pickPlan = (plan: string | null) => {
    setDraftPlans(plan ? [plan] : [])
    setPlanPickerOpen(false)
  }

  const apply = () => {
    onApply(draftPlans, draftGender)
    sheetRef.current?.dismiss()
  }

  const clear = () => {
    setDraftPlans([])
    setDraftGender('All')
    setPlanPickerOpen(false)
  }

  return (
    <BottomSheetModal ref={sheetRef} enableDynamicSizing backdropComponent={renderBackdrop} handleIndicatorStyle={{ backgroundColor: colors.border }}>
      <BottomSheetView style={{ paddingHorizontal: spacing.md, paddingBottom: bottom + spacing.md, maxHeight: 520 }}>
        {planPickerOpen ? (
          <>
            <Pressable onPress={() => setPlanPickerOpen(false)} style={{ marginBottom: spacing.sm }}>
              <Text size="sm" style={{ color: colors.primary }}>
                ← Back to filters
              </Text>
            </Pressable>
            <Text weight="semiBold" size="lg" style={{ marginBottom: spacing.sm }}>
              Plan
            </Text>
            <Pressable style={themed($optionRow)} onPress={() => pickPlan(null)}>
              <Text style={{ color: colors.text, flex: 1 }}>All plans</Text>
              {!draftPlans.length ? <Check size={20} color={colors.primary} /> : null}
            </Pressable>
            {planOptions.map((plan) => {
              const selected = draftPlans[0] === plan
              return (
                <Pressable key={plan} style={themed($optionRow)} onPress={() => pickPlan(plan)}>
                  <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
                    {plan}
                  </Text>
                  {selected ? <Check size={20} color={colors.primary} /> : null}
                </Pressable>
              )
            })}
          </>
        ) : (
          <>
            <Text weight="semiBold" size="lg" style={{ marginBottom: spacing.md }}>
              Filters
            </Text>

            <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.xs, letterSpacing: 1 }}>
              GENDER
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
              {GENDERS.map((g) => {
                const selected = draftGender === g
                return (
                  <Pressable
                    key={g}
                    onPress={() => setDraftGender(g)}
                    style={[
                      themed($chip),
                      selected && { backgroundColor: colors.primaryBackground, borderColor: colors.primary },
                    ]}
                  >
                    <Text size="sm" style={{ color: selected ? colors.primary : colors.text }}>
                      {g}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {planOptions.length > 0 && (
              <>
                <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.xs, letterSpacing: 1 }}>
                  PLAN
                </Text>
                <Pressable style={themed($selectorRow)} onPress={() => setPlanPickerOpen(true)}>
                  <Text style={themed($selectorLabel)}>Membership plan</Text>
                  <View style={$selectorRight}>
                    <Text size="sm" style={{ color: colors.textDim, maxWidth: 160 }} numberOfLines={1}>
                      {planSummary(draftPlans)}
                    </Text>
                    <ChevronRight size={20} color={colors.textDim} />
                  </View>
                </Pressable>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button title="Clear" variant="outline" onPress={clear} style={{ flex: 1 }} />
              <Button title="Apply" onPress={apply} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  )
})

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm + 4,
  paddingVertical: spacing.xxs,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.border,
})

const $selectorRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingVertical: spacing.sm + 2,
  paddingHorizontal: spacing.md,
  marginBottom: spacing.xs,
})

const $selectorLabel: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.medium,
  fontSize: 15,
  color: colors.text,
})

const $selectorRight: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  flexShrink: 1,
}

const $optionRow: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: spacing.sm + 4,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})
