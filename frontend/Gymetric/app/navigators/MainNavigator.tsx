import React, { useEffect } from "react"
import { Platform } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppTheme } from "@/theme/context"
import Home from "@/screens/Home/Home"
import ClientsList from "@/screens/Clients/ClientsList"
import Setting from "@/screens/Setting/Setting"
import { LayoutDashboard, Users, Settings } from "lucide-react-native"
import { hapticsSelection } from "@/utils/haptics"
import { useAppDispatch } from "@/redux/Hooks"
import { warmSession } from "@/services/sessionBootstrapService"

const Tab = createBottomTabNavigator();

export function MainNavigator() {
    const { theme } = useAppTheme()
    const insets = useSafeAreaInsets()
    const isAndroid = Platform.OS === 'android';
    const dispatch = useAppDispatch()

    useEffect(() => {
        warmSession(dispatch)
    }, [dispatch]);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    paddingTop: 5,
                    ...(isAndroid ? {
                        paddingBottom: Math.max(insets.bottom, 10),
                        height: 55 + Math.max(insets.bottom, 10),
                    } : {}),
                    ...theme.shadows.medium,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textDim,
                tabBarLabelStyle: {
                    fontSize: theme.typography.xxs,
                    fontWeight: theme.typography.semiBold,
                }
            }}
        >
            <Tab.Screen
                name="Home"
                component={Home}
                listeners={{ tabPress: () => hapticsSelection() }}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <LayoutDashboard size={size} color={color} />
                    ),
                }}
            />

            <Tab.Screen
                name="Clients"
                component={ClientsList}
                listeners={{ tabPress: () => hapticsSelection() }}
                options={{
                    tabBarLabel: "Members",
                    tabBarIcon: ({ color, size }) => (
                        <Users size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Setting"
                component={Setting}
                listeners={{ tabPress: () => hapticsSelection() }}
                options={{
                    tabBarLabel: 'Setting',
                    tabBarIcon: ({ color, size }) => (
                        <Settings size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    )
}
