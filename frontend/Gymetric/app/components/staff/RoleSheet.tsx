import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import { ThemedStyle } from '@/theme/types'

export type RoleOption = { _id: string; key: string | null; name: string; permissions: string[]; isSystem: boolean }

export type RoleSheetRef = { present: () => void }

type Props = {
  roles: RoleOption[]
  selectedId?: string | null
  totalPermissions: number
  onSelect: (role: RoleOption) => void
}

const ROLE_HINT: Record<string, string> = {
  manager: 'Runs the gym day to day. Sees revenue.',
  front_desk: 'Adds clients, renews, collects payments, opens the door.',
  trainer: 'Sees the client list.',
}

export const RoleSheet = forwardRef<RoleSheetRef, Props>(function RoleSheet({ roles, selectedId, totalPermissions, onSelect }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null)
  const { bottom } = useSafeAreaInsets()
  const { themed, theme: { colors, spacing } } = useAppTheme()

  useImperativeHandle(ref, () => ({ present: () => sheetRef.current?.present() }))

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />,
    [],
  )

  const choices = roles.filter((role) => role.key !== 'owner')

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      maxDynamicContentSize={560}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: bottom + spacing.md }}>
        <Text weight="semiBold" size="lg" text="Choose a role" />
        <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.sm }} text="Edit what each role can do in More, Settings, Access control." />
        {choices.map((role) => {
          const selected = role._id === selectedId
          return (
            <Pressable
              key={role._id}
              style={[themed($row), selected && { borderColor: colors.primary, backgroundColor: colors.primaryBackground }]}
              onPress={() => {
                onSelect(role)
                sheetRef.current?.dismiss()
              }}
            >
              <View style={{ flex: 1 }}>
                <Text weight="semiBold" text={role.name} />
                <Text
                  size="xxs"
                  style={{ color: colors.textDim, marginTop: 2 }}
                  text={(role.key && ROLE_HINT[role.key]) || `${role.permissions.length} of ${totalPermissions} permissions`}
                />
              </View>
              {selected ? <Check size={20} color={colors.primary} /> : null}
            </Pressable>
          )
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
})

const $row: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  padding: spacing.md,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  marginBottom: spacing.xs,
})
