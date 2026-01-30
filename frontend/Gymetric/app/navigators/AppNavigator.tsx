import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { LoginScreen } from "@/screens/LoginScreen"
import { useAppTheme } from "@/theme/context"

import type { NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { MainNavigator } from "./MainNavigator"
import CreateClient from "@/screens/Clients/ClientOnboarding"
import ClientDetails from "@/screens/Clients/ClientDetails"
import UpdateClientbasicInfo from "@/screens/Clients/CreateUpdateClient/UpdateClientBasicInfo"
import Memberships from "@/screens/Setting/Memberships/Memberships"
import CreateEditMembership from "@/screens/Setting/Memberships/CreateEditMembership"
import BusinessProfile from "@/screens/Setting/BusinessProfile"
import RenewMembership from "@/screens/Clients/ClientMembership/RenewMembership"
import SearchClient from "@/screens/Clients/SearchClient"
import { OnboardingScreen } from "@/screens/OnboardingScreen"
import HelpCenter from "@/screens/Setting/HelpCenter"
import NotificationSetting from "@/screens/Setting/NotificationSetting"
import { useAppSelector } from "@/redux/Hooks"
import { selectLoading } from "@/redux/state/GymStates"
import { ActivityIndicator, TextStyle, View } from "react-native"
import { ThemedStyle } from "@/theme/types"

const exitRoutes = Config.exitRoutes

const Stack = createNativeStackNavigator();

const AppStack = () => {
  const [authToken] = useMMKVString('authToken');
  const [hasSeenOnboarding] = useMMKVBoolean('hasSeenOnboarding');
  const isLoading = useAppSelector(selectLoading);
  const { themed, theme: { colors } } = useAppTheme()

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          navigationBarColor: colors.background,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {!hasSeenOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : authToken ? (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Group>
              <Stack.Screen name="Add Client" component={CreateClient} />
              <Stack.Screen name="Client Profile" component={ClientDetails} />
              <Stack.Screen name="Update Basic Information" component={UpdateClientbasicInfo} />
              <Stack.Screen name="Renew Membership" component={RenewMembership} />
              <Stack.Screen name="Search Client" component={SearchClient} options={{ presentation: 'fullScreenModal' }} />
            </Stack.Group>
            <Stack.Group>
              <Stack.Group>
                <Stack.Screen name="Memberships" component={Memberships} />
                <Stack.Screen name="Create Edit Membership" component={CreateEditMembership} />
              </Stack.Group>
              <Stack.Screen name="Business Profile" component={BusinessProfile} />
              <Stack.Screen name="Help Center" component={HelpCenter} />
              <Stack.Screen name="Notification Settings" component={NotificationSetting} />
            </Stack.Group>
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
      {isLoading && (
        <View style={themed($isLoading)}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
};

const $isLoading: ThemedStyle<TextStyle> = ({ colors }) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  opacity: 0.5,
  backgroundColor: colors.palette.slate950,
  justifyContent: 'center',
  alignItems: 'center'
})
