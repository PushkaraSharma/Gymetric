import React, { useEffect } from 'react'
import { ScrollView, View, ViewStyle } from 'react-native'
import { format, parseISO } from 'date-fns'
import { Check, Crown, MessageCircle, Phone } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { goBack } from '@/navigators/navigationUtilities'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { useSubscription, useViewer, type SubscriptionPlan } from '@/utils/permissions'
import { contactSales, PLAN_LABEL } from '@/utils/premium'
import { AnalyticsEvents, trackEvent } from '@/services/analyticsService'

// What each plan adds over the one before. Mirrors server/src/utils/plans.ts.
const PLANS: { plan: SubscriptionPlan; pitch: string; lead?: string; points: string[] }[] = [
  {
    plan: 'free',
    pitch: 'Run the front desk from your phone.',
    points: [
      'Unlimited clients, plans, renewals and freezes',
      'Payments, dues and receipts you can share',
      'Revenue dashboard and expiry alerts',
      "This month's reports",
    ],
  },
  {
    plan: 'pro',
    pitch: 'Stop chasing renewals by hand.',
    lead: 'Everything in Free, plus',
    points: [
      'Automatic WhatsApp welcome, renewal and expiry messages, plus a reminder before each membership ends',
      'WhatsApp chat with clients and a full message log',
      'Logins for trainers and front desk, with roles',
      'Reports for any dates, as PDF or Excel',
    ],
  },
  {
    plan: 'max',
    pitch: 'Fingerprint entry that enforces your fees.',
    lead: 'Everything in Pro, plus',
    points: [
      'Door opens only for active, paid members',
      'Automatic check-ins and visit history',
      'Staff attendance with late and absent marked',
    ],
  },
]

const PlansScreen = () => {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const subscription = useSubscription()
  const isOwner = useViewer().roleKey === 'owner'
  const gym = useAppSelector(selectGymInfo)

  useEffect(() => {
    trackEvent(AnalyticsEvents.PREMIUM_SHEET_SHOWN, { feature: 'plans', source: 'plans_screen' })
  }, [])

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header title="Plans" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
        <Text size="sm" style={{ color: colors.textDim }}>
          {`You're on ${PLAN_LABEL[subscription.plan]}`}
          {subscription.expiresAt ? ` until ${format(parseISO(subscription.expiresAt), 'd MMM yyyy')}` : ''}.
        </Text>

        {PLANS.map((item) => {
          const current = item.plan === subscription.plan
          const paid = item.plan !== 'free'
          return (
            <View key={item.plan} style={[themed($card), current && { borderColor: colors.primary, borderWidth: 2 }]}>
              <View style={$titleRow}>
                {paid ? <Crown size={18} color={colors.warning} /> : null}
                <Text weight="bold" size="lg" style={{ flex: 1 }} text={PLAN_LABEL[item.plan]} />
                {current ? (
                  <View style={[$pill, { backgroundColor: colors.primaryBackground }]}>
                    <Text size="xxs" weight="bold" style={{ color: colors.primary }} text="YOUR PLAN" />
                  </View>
                ) : null}
              </View>
              <Text size="sm" style={{ color: colors.textDim, marginTop: 2 }} text={item.pitch} />
              {item.lead ? <Text size="xs" weight="semiBold" style={{ marginTop: spacing.sm }} text={item.lead} /> : null}
              <View style={{ marginTop: spacing.sm, gap: 8 }}>
                {item.points.map((point) => (
                  <View key={point} style={$point}>
                    <Check size={16} color={colors.success} strokeWidth={3} style={{ marginTop: 2 }} />
                    <Text size="sm" style={{ flex: 1 }} text={point} />
                  </View>
                ))}
              </View>
            </View>
          )
        })}

        {isOwner ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <Button
              title="Talk to us on WhatsApp"
              icon={<MessageCircle size={18} color="#FFFFFF" />}
              onPress={() => contactSales({ gymName: gym?.name, channel: 'whatsapp' })}
            />
            <Button
              title="Call us"
              variant="outline"
              icon={<Phone size={18} color={colors.text} />}
              onPress={() => contactSales({ gymName: gym?.name, channel: 'call' })}
            />
            <Text
              size="xxs"
              style={{ color: colors.textDim, textAlign: 'center' }}
              text="Try Pro free for 14 days. We set up WhatsApp and the reader for you. WhatsApp message charges from Meta are extra."
            />
          </View>
        ) : (
          <Text size="sm" style={{ color: colors.textDim, textAlign: 'center' }} text="Ask your gym owner about upgrading." />
        )}
      </ScrollView>
    </Screen>
  )
}

export default PlansScreen

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
})

const $titleRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 8 }

const $pill: ViewStyle = { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }

const $point: ViewStyle = { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }
