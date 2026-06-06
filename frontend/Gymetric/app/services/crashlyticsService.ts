import { getCrashlytics, setUserId, recordError, setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics'

const crashlytics = getCrashlytics()

if (__DEV__) {
  setCrashlyticsCollectionEnabled(crashlytics, false)
} else {
  setCrashlyticsCollectionEnabled(crashlytics, true)
}

export const setCrashlyticsUser = async (userId: string | null) => {
  try {
    if (__DEV__) return
    await setUserId(crashlytics, userId ?? '')
  } catch (error) {
    console.debug('[Crashlytics] Failed to set user:', error)
  }
}

export const reportCrash = (error: Error) => {
  try {
    if (__DEV__) {
      console.log('[Crashlytics:DEV] Error:', error)
      return
    }
    recordError(crashlytics, error)
  } catch (e) {
    console.debug('[Crashlytics] Failed to record error:', e)
  }
}
