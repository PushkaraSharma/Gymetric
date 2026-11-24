import React, { useEffect } from "react"
import { Platform } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppTheme } from "@/theme/context"
import Home from "@/screens/Home/Home"
import ClientsList from "@/screens/Clients/ClientsList"
import MoreScreen from "@/screens/More/MoreScreen"
import WhatsAppScreen from "@/screens/WhatsApp/WhatsAppScreen"
import { LayoutDashboard, Users, LayoutGrid } from "lucide-react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFeature, usePermissions } from "@/utils/permissions"
import { hapticsSelection } from "@/utils/haptics"
import { useChatUnread } from "@/utils/chatUnread"
import { useAppDispatch } from "@/redux/Hooks"
import { warmSession } from "@/services/sessionBootstrapService"
import type { MainTabParamList } from "./navigationTypes"

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
    const { theme } = useAppTheme()
    const insets = useSafeAreaInsets()
    const isAndroid = Platform.OS === 'android';
    const dispatch = useAppDispatch()
    const can = usePermissions()
    const hasWhatsapp = useFeature('whatsapp')
    const canChat = can('whatsapp.chat') || can('whatsapp.settings')
    // No polling when the plan has no WhatsApp: the tab then shows the upgrade screen instead.
    const unread = useChatUnread(can('whatsapp.chat') && hasWhatsapp)

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
                    tabBarLabel: "Clients",
                    tabBarIcon: ({ color, size }) => (
                        <Users size={size} color={color} />
                    ),
                }}
            />
            {canChat && (
                <Tab.Screen
                    name="WhatsApp"
                    component={WhatsAppScreen}
                    listeners={{ tabPress: () => hapticsSelection() }}
                    options={{
                        tabBarLabel: 'WhatsApp',
                        tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
                        tabBarBadgeStyle: { backgroundColor: theme.colors.success, fontSize: 10 },
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="logo-whatsapp" size={size} color={color} />
                        ),
                    }}
                />
            )}
            <Tab.Screen
                name="More"
                component={MoreScreen}
                listeners={{ tabPress: () => hapticsSelection() }}
                options={{
                    tabBarLabel: 'More',
                    tabBarIcon: ({ color, size }) => (
                        <LayoutGrid size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    )
}
