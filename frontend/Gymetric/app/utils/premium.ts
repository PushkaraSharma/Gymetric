import { useEffect, useState } from 'react'
import { Linking } from 'react-native'
import type { Feature, SubscriptionPlan } from '@/utils/permissions'
import { SUPPORT_PHONE } from '@/utils/Constants'
import { AnalyticsEvents, trackEvent } from '@/services/analyticsService'

// One plans sheet for the whole app (PremiumSheet in app.tsx). Anything locked calls showPremium(feature).
type Request = { feature: Feature; source: string } | null

let current: Request = null
const listeners = new Set<(request: Request) => void>()

const emit = (request: Request) => {
  current = request
  listeners.forEach((listener) => listener(request))
}

export const showPremium = (feature: Feature, source: string) => {
  trackEvent(AnalyticsEvents.PREMIUM_SHEET_SHOWN, { feature, source })
  emit({ feature, source })
}

export const hidePremium = () => emit(null)

export function usePremiumRequest() {
  const [request, setRequest] = useState<Request>(current)
  useEffect(() => {
    listeners.add(setRequest)
    return () => {
      listeners.delete(setRequest)
    }
  }, [])
  return request
}

export const PLAN_LABEL: Record<SubscriptionPlan, string> = { free: 'GymKarta Free', pro: 'GymKarta Pro', max: 'GymKarta Max' }

const whatsappTeam = (text: string) =>
  Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`)

// Opens WhatsApp to the GymKarta team with the gym and the feature already in the message.
export const contactSales = (opts: { gymName?: string; feature?: Feature; channel: 'whatsapp' | 'call' }) => {
  trackEvent(AnalyticsEvents.PREMIUM_CONTACT, { feature: opts.feature ?? 'plans', channel: opts.channel })
  if (opts.channel === 'call') return Linking.openURL(`tel:${SUPPORT_PHONE}`)
  const about = opts.feature ? ` about ${FEATURE_COPY[opts.feature].title}` : ' about GymKarta plans'
  return whatsappTeam(`Hi GymKarta team, I'd like to know more${about}.${opts.gymName ? ` My gym: ${opts.gymName}.` : ''}`)
}

export const openSupportChat = () => whatsappTeam('Hi GymKarta team, I need help with the app.')

// Sheet copy per feature: one benefit-led title and the three things the gym gets.
export const FEATURE_COPY: Record<Feature, { title: string; pitch: string; points: string[] }> = {
  whatsapp: {
    title: 'WhatsApp automation',
    pitch: 'Reminders, receipts and replies go out on WhatsApp without anyone typing them.',
    points: [
      'Welcome, renewal and expiry messages sent automatically',
      'Due and expiry reminders days before the end date',
      'Chat with clients from the app, with a full message log',
    ],
  },
  staff: {
    title: 'Staff logins',
    pitch: 'Give trainers and front desk their own login with only the access they need.',
    points: [
      'Owner, Manager, Front desk, Trainer and custom roles',
      'Hide revenue from staff; see who collected each payment',
      'Turn a login off instantly when someone leaves',
    ],
  },
  reports: {
    title: 'Full reports',
    pitch: 'Look back at any month and share reports with your accountant.',
    points: [
      'Day book, joiners and expiries, freezes and check-ins for any dates',
      'Download as PDF or CSV and share in one tap',
      'Collections split by payment method and by staff',
    ],
  },
  biometric: {
    title: 'Fingerprint entry',
    pitch: 'The door opens only for clients with an active, paid membership.',
    points: [
      'Automatic check-ins and attendance, no register',
      'Entry stops when fees are due, with no arguments at the desk',
      'Staff attendance with late and absent marked for you',
    ],
  },
}
