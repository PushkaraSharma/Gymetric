import { getAnalytics, logEvent, setUserProperty, setUserId, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics'
import { Platform } from 'react-native'

const analytics = getAnalytics()

if (__DEV__) {
  setAnalyticsCollectionEnabled(analytics, false)
} else {
  setAnalyticsCollectionEnabled(analytics, true)
}

export const AnalyticsEvents = {
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',
  CLIENT_ADDED: 'client_added',
  MEMBERSHIP_RENEWED: 'membership_renewed',
  MEMBERSHIP_PLAN_CREATED: 'membership_plan_created',
  WHATSAPP_CONNECTED: 'whatsapp_connected',
  DASHBOARD_STAT_TAPPED: 'dashboard_stat_tapped',
  DARK_MODE_TOGGLED: 'dark_mode_toggled',
  APP_OPENED: 'app_opened',
  SCREEN_VIEWED: 'screen_view',
} as const

export const trackEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean>
) => {
  try {
    if (__DEV__) {
      console.log(`[Analytics:DEV] Event: ${eventName}`, params)
      return
    }
    await logEvent(analytics, eventName, params)
  } catch (error) {
    console.debug('[Analytics] Failed to track event:', eventName, error)
  }
}

export const trackScreenView = async (screenName: string) => {
  try {
    if (__DEV__) {
      console.log(`[Analytics:DEV] Screen: ${screenName}`)
      return
    }
    await logEvent(analytics, 'screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    })
  } catch (error) {
    console.debug('[Analytics] Failed to track screen:', screenName, error)
  }
}

export const setGymStats = async (stats: {
  totalClients: number
  activeMembers: number
  hasWhatsapp: boolean
}) => {
  try {
    if (__DEV__) {
      console.log('[Analytics:DEV] Gym stats:', stats)
      return
    }
    await setUserProperty(analytics, 'total_clients', stats.totalClients.toString())
    await setUserProperty(analytics, 'active_members', stats.activeMembers.toString())
    await setUserProperty(analytics, 'has_whatsapp', stats.hasWhatsapp.toString())
    const segment = stats.totalClients > 100 ? 'large_gym' : stats.totalClients > 20 ? 'medium_gym' : 'small_gym'
    await setUserProperty(analytics, 'gym_segment', segment)
  } catch (error) {
    console.debug('[Analytics] Failed to set gym stats:', error)
  }
}

export const setAnalyticsUser = async (user: { id: string; username: string } | null) => {
  try {
    if (__DEV__) {
      console.log('[Analytics:DEV] Set user:', user)
      return
    }
    if (user) {
      await setUserId(analytics, user.id)
      await setUserProperty(analytics, 'username', user.username)
    } else {
      await setUserId(analytics, null)
    }
  } catch (error) {
    console.debug('[Analytics] Failed to set user identity:', error)
  }
}

export const setEnrichedUserProperties = async (props: {
  appVersion?: string
  darkMode?: boolean
  daysSinceSignup?: number
  gymId?: string
}) => {
  try {
    if (__DEV__) {
      console.log('[Analytics:DEV] Enriched properties:', props)
      return
    }
    await setUserProperty(analytics, 'platform', Platform.OS)
    if (props.appVersion) await setUserProperty(analytics, 'app_version', props.appVersion)
    if (props.darkMode !== undefined) await setUserProperty(analytics, 'dark_mode', props.darkMode.toString())
    if (props.daysSinceSignup !== undefined) await setUserProperty(analytics, 'days_since_signup', props.daysSinceSignup.toString())
    if (props.gymId) await setUserProperty(analytics, 'gym_id', props.gymId)
  } catch (error) {
    console.debug('[Analytics] Failed to set enriched properties:', error)
  }
}
