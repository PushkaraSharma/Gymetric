import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import { SortKey } from '@/utils/clientFilters'
import { ThemedStyle } from '@/theme/types'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'name_asc', label: 'Name A → Z' },
  { id: 'name_desc', label: 'Name Z → A' },
  { id: 'expiry_soonest', label: 'Expiry soonest' },
  { id: 'newest_joined', label: 'Newest joined' },
]

export type MembersSortSheetRef = { present: () => void }

type Props = {
  sortKey: SortKey
  onSelect: (key: SortKey) => void
}

export const MembersSortSheet = forwardRef<MembersSortSheetRef, Props>(function MembersSortSheet(
  { sortKey, onSelect },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null)
  const { bottom } = useSafeAreaInsets()
  const { themed, theme: { colors, spacing } } = useAppTheme()

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
  }))

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    [],
  )

  const pick = (id: SortKey) => {
    onSelect(id)
    sheetRef.current?.dismiss()
  }

  return (
    <BottomSheetModal ref={sheetRef} enableDynamicSizing backdropComponent={renderBackdrop} handleIndicatorStyle={{ backgroundColor: colors.border }}>
      <BottomSheetView style={{ paddingHorizontal: spacing.md, paddingBottom: bottom + spacing.md }}>
        <Text weight="semiBold" size="lg" style={{ marginBottom: spacing.sm }}>
          Sort by
        </Text>
        {SORT_OPTIONS.map((opt) => {
          const selected = sortKey === opt.id
          return (
            <Pressable key={opt.id} style={themed($row)} onPress={() => pick(opt.id)}>
              <Text style={{ color: colors.text, flex: 1 }}>{opt.label}</Text>
              {selected ? <Check size={20} color={colors.primary} /> : null}
            </Pressable>
          )
        })}
      </BottomSheetView>
    </BottomSheetModal>
  )
})

const $row: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: spacing.sm + 4,
})
