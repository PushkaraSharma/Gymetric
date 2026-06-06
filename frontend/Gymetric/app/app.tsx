/* eslint-disable import/first */
if (__DEV__) {
  require("./devtools/ReactotronConfig.ts")
}
import "./utils/gestureHandler"

import { useEffect, useState } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import * as Updates from "expo-updates"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { AppNavigator } from "./navigators/AppNavigator"
import { useNavigationPersistence } from "./navigators/navigationUtilities"
import { ThemeProvider } from "./theme/context"
import { loadDateFnsLocale } from "./utils/formatDate"
import * as storage from "./utils/LocalStorage"
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { store } from "./redux/Store"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useToastConfig } from "./components/ToastConfig"
import { trackEvent, AnalyticsEvents } from "./services/analyticsService"

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"

function ToastApp() {
  const toastConfig = useToastConfig()
  return (
    <Toast
      config={toastConfig}
      topOffset={initialWindowMetrics?.insets.top ?? 40}
      visibilityTime={2000}
    />
  )
}

export function App() {
  const {
    initialNavigationState,
    onNavigationStateChange,
    isRestored: isNavigationStateRestored,
  } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  const [isReady, setIsReady] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function checkUpdates() {
      if (__DEV__) return
      try {
        const update = await Updates.checkForUpdateAsync()
        if (update.isAvailable) {
          setIsUpdating(true)
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch (e) {
        console.log(e)
        setIsUpdating(false)
      }
    }
    checkUpdates()
  }, [])

  useEffect(() => {
    loadDateFnsLocale()
    setIsReady(true)
    trackEvent(AnalyticsEvents.APP_OPENED)
  }, [])

  if (isUpdating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <Text style={{ marginTop: 20, fontSize: 16, marginBottom: 10 }}>Updating App</Text>
        <ActivityIndicator />
      </View>
    )
  }

  if (!isNavigationStateRestored || !isReady) {
    return null
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <Provider store={store}>
            <ThemeProvider>
              <BottomSheetModalProvider>
                <AppNavigator
                  initialState={initialNavigationState}
                  onStateChange={onNavigationStateChange}
                />
                <ToastApp />
              </BottomSheetModalProvider>
            </ThemeProvider>
          </Provider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}
