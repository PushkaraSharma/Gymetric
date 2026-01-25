import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { LoginScreen } from "@/screens/LoginScreen"
import { useAppTheme } from "@/theme/context"

import type { NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { useMMKVString } from "react-native-mmkv"
import { MainNavigator } from "./MainNavigator"
import CreateClient from "@/screens/Clients/ClientOnboarding"
import ClientDetails from "@/screens/Clients/ClientDetails"
import UpdateClientbasicInfo from "@/screens/Clients/CreateUpdateClient/UpdateClientBasicInfo"
import Memberships from "@/screens/Setting/Memberships/Memberships"
import CreateEditMembership from "@/screens/Setting/Memberships/CreateEditMembership"
import BusinessProfile from "@/screens/Setting/BusinessProfile"
import ContactDetails from "@/screens/Setting/ContactDetails"
import RenewMembership from "@/screens/Clients/ClientMembership/RenewMembership"
import SearchClient from "@/screens/Clients/SearchClient"

const exitRoutes = Config.exitRoutes

const Stack = createNativeStackNavigator();

const AppStack = () => {
  const [authToken] = useMMKVString('authToken');

  const { theme: { colors } } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {authToken ? (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Group>
            <Stack.Screen name="Add Client" component={CreateClient} />
            <Stack.Screen name="Client Profile" component={ClientDetails} />
            <Stack.Screen name="Update Basic Information" component={UpdateClientbasicInfo} />
            <Stack.Screen name="Renew Membership" component={RenewMembership}/>
            <Stack.Screen name="Search Client" component={SearchClient} options={{presentation: 'fullScreenModal'}}/>
          </Stack.Group>
          <Stack.Group>
            <Stack.Group>
              <Stack.Screen name="Memberships" component={Memberships} />
              <Stack.Screen name="Create Edit Membership" component={CreateEditMembership} />
            </Stack.Group>
            <Stack.Screen name="Business Profile" component={BusinessProfile}/>
            <Stack.Screen name="Contact Details" component={ContactDetails}/>
          </Stack.Group>

        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      )}
    </Stack.Navigator>
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
}
