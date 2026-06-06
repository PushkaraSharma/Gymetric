import React, { JSX } from 'react'
import { Pressable, View, ViewStyle, TextStyle } from 'react-native'
import { MotiView } from 'moti'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus,
  RefreshCw,
  AlertCircle,
  Wallet,
  Activity as ActivityIconLucide,
} from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { navigate } from '@/navigators/navigationUtilities'

interface ActivityItem {
  _id?: string
  type?: string
  title?: string
  description?: string
  date?: string
  amount?: number
  memberId?: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const { themed } = useAppTheme()

  if (!activities?.length) {
    return (
      <View style={themed($empty)}>
        <Text style={themed($emptyText)} text="No recent activity yet." />
      </View>
    )
  }

  return (
    <View style={$list}>
      {activities.map((activity, index) => (
        <ActivityCard item={activity} key={activity._id || index} />
      ))}
    </View>
  )
}

const ActivityCard = React.memo(({ item }: { item: ActivityItem }) => {
  const { themed, theme: { colors } } = useAppTheme()

  const ActivityIcons: { [key: string]: JSX.Element } = {
    ONBOARDING: <UserPlus size={20} color={colors.success} />,
    RENEWAL: <RefreshCw size={20} color={colors.primary} />,
    EXPIRY: <AlertCircle size={20} color={colors.error} />,
    PAYMENT: <Wallet size={20} color={colors.success} />,
    ADVANCE_RENEWAL: <RefreshCw size={20} color={colors.primary} />,
  }

  return (
    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Pressable
        style={themed($activityCard)}
        onPress={() => item?.memberId && navigate('Client Profile', { data: { _id: item.memberId } })}
      >
        <View style={themed($activityIconWrapper)}>
          {ActivityIcons[item?.type ?? ''] || <ActivityIconLucide size={20} color={colors.primary} />}
        </View>
        <View style={$activityContent}>
          <View style={$activityTopRow}>
            <Text style={themed($activityTitle)} text={item?.title ?? ''} />
            <Text
              style={themed($activityTime)}
              text={formatDistanceToNow(new Date(item?.date || new Date()), { addSuffix: true })}
            />
          </View>
          <Text style={themed($activityDesc)} numberOfLines={1} text={item?.description ?? ''} />
          {item?.amount ? (
            <Text style={themed($activityAmount)} text={`₹${item.amount}`} />
          ) : null}
        </View>
      </Pressable>
    </MotiView>
  )
})

const $list: ViewStyle = { marginBottom: 20 }
const $empty: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.lg, alignItems: 'center' })
const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim, fontSize: 14 })
const $activityCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  backgroundColor: colors.surface,
  padding: spacing.md,
  borderRadius: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: colors.border,
})
const $activityIconWrapper: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background,
  alignItems: 'center', justifyContent: 'center', marginRight: 12,
})
const $activityContent: ViewStyle = { flex: 1 }
const $activityTopRow: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }
const $activityTitle: ThemedStyle<TextStyle> = ({ typography, colors }) => ({ fontWeight: typography.semiBold, fontSize: 14, color: colors.text })
const $activityTime: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 10, color: colors.textDim })
const $activityDesc: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 12, color: colors.textDim })
const $activityAmount: ThemedStyle<TextStyle> = ({ colors, typography }) => ({ fontSize: 14, fontWeight: typography.bold, color: colors.text, marginTop: 4 })
