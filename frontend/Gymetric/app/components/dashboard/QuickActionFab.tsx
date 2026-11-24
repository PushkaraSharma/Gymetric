import React, { useState } from 'react'
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { MotiView } from 'moti'
import { Plus } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'

export type QuickAction = { key: string; label: string; icon: React.ComponentType<{ size: number; color: string }>; onPress: () => void }

// The Home + button. One action: it runs straight away. Several: it opens a small menu above the button.
export function QuickActionFab({ actions }: { actions: QuickAction[] }) {
  const { theme: { colors } } = useAppTheme()
  const [open, setOpen] = useState(false)

  if (actions.length === 0) return null

  const run = (action: QuickAction) => {
    setOpen(false)
    action.onPress()
  }

  const onFabPress = () => (actions.length === 1 ? run(actions[0]) : setOpen((current) => !current))

  return (
    <>
      {open ? (
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.35)' }]} onPress={() => setOpen(false)} accessibilityLabel="Close menu" />
      ) : null}
      {open ? (
        <View style={$menu} pointerEvents="box-none">
          {actions.map((action, index) => (
            <MotiView
              key={action.key}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 160, delay: (actions.length - 1 - index) * 40 }}
            >
              <Pressable
                style={({ pressed }) => [$item, { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => run(action)}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text weight="semiBold" text={action.label} />
                <View style={[$itemIcon, { backgroundColor: colors.primaryBackground }]}>
                  <action.icon size={18} color={colors.primary} />
                </View>
              </Pressable>
            </MotiView>
          ))}
        </View>
      ) : null}
      <Pressable
        style={[$fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={onFabPress}
        accessibilityRole="button"
        accessibilityLabel={actions.length === 1 ? actions[0].label : open ? 'Close quick actions' : 'Quick actions'}
      >
        <MotiView animate={{ rotate: open ? '45deg' : '0deg' }} transition={{ type: 'timing', duration: 160 }}>
          <Plus size={28} color={colors.background} />
        </MotiView>
      </Pressable>
    </>
  )
}

const $fab: ViewStyle = {
  position: 'absolute',
  bottom: 24,
  right: 24,
  width: 60,
  height: 60,
  borderRadius: 30,
  alignItems: 'center',
  justifyContent: 'center',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 8,
}

const $menu: ViewStyle = { position: 'absolute', right: 24, bottom: 96, alignItems: 'flex-end', gap: 12 }

const $item: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingLeft: 16,
  paddingRight: 8,
  paddingVertical: 8,
  borderRadius: 999,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 4,
}

const $itemIcon: ViewStyle = { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }
