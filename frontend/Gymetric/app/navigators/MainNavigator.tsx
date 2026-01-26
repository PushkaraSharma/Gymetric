import { TextStyle, ViewStyle } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import Home from "@/screens/Home/Home"
import ClientsList from "@/screens/Clients/ClientsList"
import Setting from "@/screens/Setting/Setting"
import { Octicons } from '@expo/vector-icons'
import { useEffect } from "react"
import { api } from "@/services/Api"

const Tab = createBottomTabNavigator();

export function MainNavigator() {
    const { bottom } = useSafeAreaInsets()
    const { themed, theme: { colors } } = useAppTheme()

    useEffect(() => {
        api.gymInfo(); //later will move to initial fetch
        api.allClients();
    }, []);

    return (
            <Tab.Navigator
                screenOptions={{
                    headerShown: false,
                    tabBarHideOnKeyboard: true,
                    tabBarStyle: themed([$tabBar, { height: bottom + 70 }]),
                    tabBarActiveTintColor: colors.text,
                    tabBarInactiveTintColor: colors.text,
                    tabBarLabelStyle: themed($tabBarLabel),
                    tabBarItemStyle: themed($tabBarItem),
                }}
            >
                <Tab.Screen
                    name="Home"
                    component={Home}
                    options={{
                        tabBarLabel: 'Home',
                        tabBarIcon: ({ focused }) => (
                            <Octicons name="home" size={25} color={focused ? colors.tint : colors.tintInactive} />
                        ),
                    }}
                />

                <Tab.Screen
                    name="Clients"
                    component={ClientsList}
                    options={{
                        tabBarLabel: "Clients",
                        tabBarIcon: ({ focused }) => (
                            <Octicons name="people" size={25} color={focused ? colors.tint : colors.tintInactive} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="Setting"
                    component={Setting}
                    options={{
                        tabBarLabel: 'Setting',
                        tabBarIcon: ({ focused }) => (
                            <Octicons name="gear" size={25} color={focused ? colors.tint : colors.tintInactive} />
                        ),
                    }}
                />
            </Tab.Navigator>
    )
}

const $tabBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.background,
    borderTopColor: colors.transparent,
})

const $tabBarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    paddingTop: spacing.md,
})

const $tabBarLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    fontSize: 12,
    fontFamily: typography.primary.medium,
    lineHeight: 16,
    color: colors.text,
})
