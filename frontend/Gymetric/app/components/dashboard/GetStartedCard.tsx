import React, { useEffect, useState } from 'react'
import { View, Pressable, ViewStyle, TextStyle } from 'react-native'
import { CreditCard, UserPlus, MessageCircle, ChevronRight, Check, X } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { storage } from '@/utils/LocalStorage'
import { navigate } from '@/navigators/navigationUtilities'

interface GetStartedCardProps {
  totalClients: number
  hasMembershipPlans: boolean
}

const DISMISS_KEY = '@get_started_dismissed'

export function GetStartedCard({ totalClients, hasMembershipPlans }: GetStartedCardProps) {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (storage.getString(DISMISS_KEY) === 'true') setDismissed(true)
  }, [])

  const steps = [
    {
      id: 'plan',
      label: 'Create a Membership Plan',
      description: 'Set up pricing and durations',
      icon: CreditCard,
      completed: hasMembershipPlans,
      action: () => navigate('Memberships'),
    },
    {
      id: 'client',
      label: 'Add Your First Client',
      description: 'Onboard a gym member',
      icon: UserPlus,
      completed: totalClients > 0,
      action: () => navigate('Add Client'),
    },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const allDone = completedCount === steps.length

  if (dismissed || allDone) return null

  const handleDismiss = () => {
    storage.set(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <View style={themed($card)}>
      <View style={$header}>
        <View style={{ flex: 1 }}>
          <Text style={themed($title)} text="Get Started" />
          <Text style={themed($subtitle)} text={`${completedCount} of ${steps.length} completed`} />
        </View>
        <Pressable onPress={handleDismiss} hitSlop={12}>
          <X size={20} color={colors.textDim} />
        </Pressable>
      </View>
      <View style={themed($progressTrack)}>
        <View style={[themed($progressFill), { width: `${(completedCount / steps.length) * 100}%` }]} />
      </View>
      {steps.map((step) => {
        const Icon = step.icon
        return (
          <Pressable key={step.id} style={themed($stepRow)} onPress={step.action}>
            <View style={[themed($stepIcon), step.completed && { backgroundColor: colors.successBackground }]}>
              {step.completed ? (
                <Check size={18} color={colors.success} />
              ) : (
                <Icon size={18} color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[themed($stepLabel), step.completed && { color: colors.textDim, textDecorationLine: 'line-through' }]} text={step.label} />
              <Text style={themed($stepDesc)} text={step.description} />
            </View>
            {!step.completed && <ChevronRight size={18} color={colors.textDim} />}
          </Pressable>
        )
      })}
    </View>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 20,
  padding: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})
const $header: ViewStyle = { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }
const $title: ThemedStyle<TextStyle> = ({ typography, colors }) => ({ fontFamily: typography.secondary.bold, fontSize: 18, color: colors.text })
const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 12, color: colors.textDim, marginTop: 2 })
const $progressTrack: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ height: 6, backgroundColor: colors.background, borderRadius: 3, marginBottom: spacing.md, overflow: 'hidden' })
const $progressFill: ThemedStyle<ViewStyle> = ({ colors }) => ({ height: '100%', backgroundColor: colors.primary, borderRadius: 3 })
const $stepRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: 12 })
const $stepIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryBackground, alignItems: 'center', justifyContent: 'center' })
const $stepLabel: ThemedStyle<TextStyle> = ({ typography, colors }) => ({ fontFamily: typography.primary.semiBold, fontSize: 14, color: colors.text })
const $stepDesc: ThemedStyle<TextStyle> = ({ colors }) => ({ fontSize: 12, color: colors.textDim, marginTop: 2 })
