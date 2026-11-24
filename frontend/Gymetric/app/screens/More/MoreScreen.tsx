import React from 'react'
import { Image, Pressable, ScrollView, View, ViewStyle, TextStyle } from 'react-native'
import Constants from 'expo-constants'
import { BarChart3, CalendarCheck, ChevronRight, CreditCard, Fingerprint, MapPin, Settings, Users } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { navigate } from '@/navigators/navigationUtilities'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { useFeatures, usePermissions, useViewer, type Feature } from '@/utils/permissions'
import { PlanChip } from '@/components/premium/PlanChip'
import { showPremium } from '@/utils/premium'
import { OTA_VERSION } from '@/utils/Constants'

type Tile = {
  key: string
  label: string
  hint: string
  icon: React.ComponentType<{ size: number; color: string }>
  route: string
  visible: boolean
  // Paid feature behind the tile. Owners see it locked with a chip; staff don't see it at all.
  feature?: Feature
}

const MoreScreen = () => {
  const { theme: { colors, spacing, isDark }, themed } = useAppTheme()
  const gym = useAppSelector(selectGymInfo)
  const can = usePermissions()
  const has = useFeatures()
  const isOwner = useViewer().roleKey === 'owner'
  const canEditGym = can('settings.branch')

  const tiles: Tile[] = [
    { key: 'staff', label: 'Staff', hint: 'Team, shifts and logins', icon: Users, route: 'Staff', visible: can('staff.view'), feature: 'staff' },
    { key: 'attendance', label: 'Attendance', hint: 'Client check-ins and staff punches', icon: CalendarCheck, route: 'Attendance', visible: can('clients.view') || can('attendance.manage'), feature: 'biometric' },
    { key: 'reports', label: 'Reports', hint: 'Day book, expiries, exports', icon: BarChart3, route: 'Reports', visible: can('reports.view') },
    { key: 'entrance', label: 'Entrance reader', hint: 'Fingerprint door access', icon: Fingerprint, route: 'Entrance', visible: can('entrance.manage') || can('door.open'), feature: 'biometric' },
    { key: 'plans', label: 'Memberships', hint: 'Plans, prices and durations', icon: CreditCard, route: 'Memberships', visible: can('settings.plans') },
    { key: 'settings', label: 'Settings', hint: 'Notifications, WhatsApp, access', icon: Settings, route: 'Settings', visible: true },
  ]

  return (
    <Screen preset="fixed" safeAreaEdges={['top']} contentContainerStyle={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        <Text preset="heading" style={{ marginBottom: spacing.md }} text="More" />

        <Pressable
          style={({ pressed }) => [themed($gymCard), { opacity: pressed && canEditGym ? 0.85 : 1 }]}
          onPress={canEditGym ? () => navigate('Gym Info') : undefined}
          disabled={!canEditGym}
        >
          <Image
            source={gym?.logo ? { uri: gym.logo } : isDark ? require('@assets/images/app-icon-dark.png') : require('@assets/images/app-icon.png')}
            style={themed($gymLogo)}
          />
          <View style={{ flex: 1 }}>
            <Text weight="bold" size="md" numberOfLines={1} text={gym?.name ?? ''} />
            {gym?.address ? (
              <View style={$addressRow}>
                <MapPin size={13} color={colors.textDim} />
                <Text size="xxs" numberOfLines={1} style={{ color: colors.textDim, flex: 1 }} text={gym.address} />
              </View>
            ) : null}
            {canEditGym ? <Text size="xxs" weight="semiBold" style={{ color: colors.primary, marginTop: 4 }} text="Edit gym info" /> : null}
          </View>
          {canEditGym ? <ChevronRight size={20} color={colors.textDim} /> : null}
        </Pressable>

        <View style={$grid}>
          {tiles.filter((tile) => tile.visible && (isOwner || !tile.feature || has(tile.feature))).map((tile) => {
            const locked = !!tile.feature && !has(tile.feature)
            return (
            <Pressable
              key={tile.key}
              style={({ pressed }) => [themed($tile), { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => (locked ? showPremium(tile.feature!, `more_${tile.key}`) : navigate(tile.route as any))}
              accessibilityHint={locked ? 'Paid feature. Opens plan details.' : undefined}
            >
              <View style={$tileTop}>
                <View style={themed($tileIcon)}>
                  <tile.icon size={22} color={locked ? colors.textDim : colors.primary} />
                </View>
                {locked ? <PlanChip feature={tile.feature!} /> : null}
              </View>
              <Text weight="semiBold" style={{ marginTop: spacing.sm }} text={tile.label} />
              <Text size="xxs" numberOfLines={2} style={{ color: colors.textDim, marginTop: 2 }} text={tile.hint} />
            </Pressable>
            )
          })}
        </View>

        <Text size="xxs" style={themed($version)} text={`GymKarta v${Constants.expoConfig?.version}_${OTA_VERSION}`} />
      </ScrollView>
    </Screen>
  )
}

export default MoreScreen

const $gymCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.md,
  padding: spacing.md,
  borderRadius: 20,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  marginBottom: spacing.lg,
})

const $gymLogo: ThemedStyle<any> = ({ colors }) => ({
  width: 56,
  height: 56,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
})

const $addressRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }

const $grid: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }

const $tile: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: '48.5%',
  padding: spacing.md,
  borderRadius: 18,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 128,
})

const $tileIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  backgroundColor: colors.primaryBackground,
  alignItems: 'center',
  justifyContent: 'center',
})

const $version: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: 'center',
  marginTop: spacing.xl,
})

const $tileTop: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }
