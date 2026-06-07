import React from 'react'
import { Pressable, View, ViewStyle } from 'react-native'
import { ChevronRight, Clock, AlertCircle } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { MotiView } from 'moti'

type Props = {
    client: any
    index: number
    onPress: () => void
}

export function ClientListCard({ client, index, onPress }: Props) {
    const { theme: { colors, typography }, themed } = useAppTheme()

    const getStatusStyle = (st: string) => {
        switch (st) {
            case 'active': return { bg: colors.successBackground, text: colors.success }
            case 'trial': return { bg: colors.primaryBackground, text: colors.primary }
            case 'future': return { bg: colors.palette.slate100, text: colors.palette.slate600 }
            case 'paused': return { bg: colors.primaryBackground, text: colors.primary }
            case 'expired':
            case 'trial_expired': return { bg: colors.errorBackground, text: colors.error }
            default: return { bg: colors.surface, text: colors.textDim }
        }
    }

    const st = getStatusStyle(client.membershipStatus)
    const endDate = client.activeMembership?.endDate
    const daysLeft = endDate ? differenceInCalendarDays(parseISO(endDate), new Date()) : null
    const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && client.membershipStatus === 'active'
    const hasBalance = (client.balance || 0) > 0

    return (
        <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: Math.min(index * 40, 200) }}
        >
            <Pressable style={themed($card)} onPress={onPress}>
                <ProfileInitialLogo name={client.name} size={52} imageUrl={client.profilePicture} />
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text weight="semiBold" size="sm" numberOfLines={1} style={{ flex: 1 }}>{client.name}</Text>
                    </View>
                    <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>{client.phoneNumber}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {client.activeMembership?.planName && (
                            <Text size="xxs" style={{ color: colors.textDim }}>{client.activeMembership.planName}</Text>
                        )}
                        {isExpiringSoon && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Clock size={11} color={colors.palette.indigo500} />
                                <Text size="xxs" style={{ color: colors.palette.indigo500 }}>{daysLeft}d left</Text>
                            </View>
                        )}
                        {daysLeft !== null && daysLeft < 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <AlertCircle size={11} color={colors.error} />
                                <Text size="xxs" style={{ color: colors.error }}>Expired</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={{ alignItems: 'center', gap: 6, flexDirection: 'row' }}>
                    <View style={{ gap: 8 }}>
                        <View style={[themed($badge), { backgroundColor: st.bg }]}>
                            <Text size="xxs" weight="semiBold" style={{ color: st.text, textTransform: 'uppercase' }}>{client.membershipStatus}</Text>
                        </View>
                        {hasBalance && (
                            <View style={[themed($badge), { backgroundColor: colors.errorBackground }]}>
                                <Text size="xxs" weight="semiBold" style={{ color: colors.error }}>₹{client.balance}</Text>
                            </View>
                        )}
                    </View>

                    <ChevronRight size={18} color={colors.borderStrong} />
                </View>
            </Pressable>
        </MotiView>
    )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
})

const $badge: ThemedStyle<ViewStyle> = () => ({
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
})
