import { Platform, Pressable, ScrollView, TextStyle, View, ViewStyle, TouchableOpacity } from 'react-native'
import React, { JSX, useCallback, useMemo, useState } from 'react'
import { Drawer } from "react-native-drawer-layout"
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from "@/components/Text"
import {
    Users,
    Activity as ActivityIconLucide,
    TrendingUp,
    Wallet,
    Clock,
    RefreshCw,
    UserPlus,
    AlertCircle,
    Plus,
    Menu
} from 'lucide-react-native'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectGymInfo, setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect } from '@react-navigation/native'
import SideDrawer from './SideDrawer'
import { getGreeting } from '@/utils/Helper'
import { formatDistanceToNow } from 'date-fns'
import { MotiView } from 'moti'

const Home = () => {
    const { themed, theme: { colors, spacing, typography } } = useAppTheme();
    const dispatch = useAppDispatch();
    const gymInfo = useAppSelector(selectGymInfo);
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState<{ [key: string]: any } | null>(null);
    const greeting = useMemo(() => getGreeting(), []);

    const ActivityIcons: { [key: string]: JSX.Element } = {
        'ONBOARDING': <UserPlus size={20} color={colors.success} />,
        'RENEWAL': <RefreshCw size={20} color={colors.primary} />,
        'EXPIRY': <AlertCircle size={20} color={colors.error} />,
        'PAYMENT': <Wallet size={20} color={colors.success} />,
        'ADVANCE_RENEWAL': <RefreshCw size={20} color={colors.primary} />
    };

    const loadData = async () => {
        dispatch(setLoading({ loading: true }));
        const response = await api.dashboardAPI();
        if (response.kind === 'ok') {
            setSummary(response.data);
        }
        dispatch(setLoading({ loading: false }));
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const StatCard = ({ label, value, trend, icon, color, isLarge = false }: any) => (
        <View style={[themed($statCard), isLarge && { width: '100%', marginBottom: 16 }]}>
            <View style={$statHeader}>
                <View style={[themed($iconContainer), { backgroundColor: color + '15' }]}>
                    {icon}
                </View>
                {trend && (
                    <View style={[themed($trendBadge), { backgroundColor: colors.successBackground }]}>
                        <TrendingUp size={12} color={colors.success} />
                        <Text size="xxs" style={themed({ color: colors.success, marginLeft: 4 })}>{trend}%</Text>
                    </View>
                )}
            </View>
            <Text style={themed($statValue)}>{value}</Text>
            <Text style={themed($statLabel)}>{label}</Text>
        </View>
    );

    const ActivityCard = ({ item }: { item: any }) => (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={themed($activityCard)}
        >
            <View style={themed($activityIconWrapper)}>
                {ActivityIcons[item?.type] || <ActivityIconLucide size={20} color={colors.primary} />}
            </View>
            <View style={$activityContent}>
                <View style={$activityTopRow}>
                    <Text style={themed($activityTitle)}>{item?.title}</Text>
                    <Text style={themed($activityTime)}>{formatDistanceToNow(new Date(item?.createdAt), { addSuffix: true })}</Text>
                </View>
                <Text style={themed($activityDesc)} numberOfLines={1}>{item?.description}</Text>
                {item?.amount && (
                    <Text style={themed($activityAmount)}>₹{item?.amount}</Text>
                )}
            </View>
        </MotiView>
    );

    return (
        <Drawer
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            drawerType="slide"
            renderDrawerContent={() => <SideDrawer />}
        >
            <Screen
                preset="auto"
                ScrollViewProps={{ showsVerticalScrollIndicator: false }}
                safeAreaEdges={["top"]}
                backgroundColor={colors.background}
            >
                <View style={themed($header)}>
                    <Pressable onPress={() => { setOpen(!open) }} style={themed($menuBtn)}>
                        <Menu size={24} color={colors.text} />
                    </Pressable>
                    <View style={$headerText}>
                        <Text style={themed($greeting)}>{greeting},</Text>
                        <Text style={themed($ownerName)}>{gymInfo?.ownerName || 'Admin'}</Text>
                    </View>
                </View>

                <View style={themed($content)}>
                    <View style={$revenueCardContainer}>
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            style={themed($revenueCard)}
                        >
                            <View style={$revenueHeader}>
                                <Text style={themed($revenueLabel)}>Revenue this month</Text>
                                <Wallet size={24} color={colors.white} opacity={0.8} />
                            </View>
                            <Text size='xl' style={themed($revenueValue)} numberOfLines={1}>
                                ₹{summary?.revenueThisMonth?.value ?? 0}
                            </Text>
                            <View style={$revenueFooter}>
                                <View style={themed($revenueTrend)}>
                                    <TrendingUp size={14} color={colors.white} />
                                    <Text style={themed($revenueTrendText)} size="xs">
                                        +{summary?.revenueThisMonth?.trend || 0}% from last month
                                    </Text>
                                </View>
                            </View>
                        </MotiView>
                    </View>

                    <View style={$statsGrid}>
                        <StatCard
                            label="Total Members"
                            value={summary?.totalClients ?? 0}
                            icon={<Users size={20} color={colors.primary} />}
                            color={colors.primary}
                        />
                        <StatCard
                            label="Active Now"
                            value={summary?.activeMembers?.value ?? 0}
                            trend={summary?.activeMembers?.trend}
                            icon={<ActivityIconLucide size={20} color={colors.success} />}
                            color={colors.success}
                        />
                    </View>

                    <View style={$statsGrid}>
                        <StatCard
                            label="Expiring Soon (7 Days)"
                            value={summary?.expiringIn7Days ?? 0}
                            icon={<Clock size={20} color={colors.error} />}
                            color={colors.error}
                        />
                        <StatCard
                            label="New Joinees"
                            value={summary?.newlyJoinedThisMonth?.value ?? 0}
                            icon={<UserPlus size={20} color={colors.palette.indigo500} />}
                            color={colors.palette.indigo500}
                        />
                    </View>

                    <View style={$sectionHeader}>
                        <Text style={themed($sectionTitle)}>Recent Activity</Text>
                        <TouchableOpacity onPress={loadData}>
                            <RefreshCw size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={$activityList}>
                        {summary?.activities?.map((activity: any, index: number) => (
                            <ActivityCard item={activity} key={index} />
                        ))}
                    </View>
                </View>
            </Screen>

            <Pressable
                style={themed($fab)}
                onPress={() => navigate('Add Client')}
            >
                <Plus size={28} color={colors.background} />
            </Pressable>
        </Drawer>
    )
}

export default Home

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
})

const $menuBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
})

const $headerText: ViewStyle = {
    flex: 1,
    marginLeft: 16,
}

const $greeting: ThemedStyle<TextStyle> = ({ colors }) => ({
    fontSize: 14,
    color: colors.textDim,
})

const $ownerName: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
    fontFamily: typography.secondary.bold,
    fontSize: 18,
    color: colors.text,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
})

const $revenueCardContainer: ViewStyle = {
    marginVertical: 16,
}

const $revenueCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.palette.indigo600,
    borderRadius: 24,
    padding: spacing.md,
    shadowColor: colors.palette.indigo600,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
})

const $revenueHeader: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
}

const $revenueLabel: TextStyle = {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
}

const $revenueValue: ThemedStyle<TextStyle> = ({ typography }) => ({
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: typography.secondary.bold,
    marginBottom: 16,
})

const $revenueFooter: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
}

const $revenueTrend: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
}

const $revenueTrendText: ThemedStyle<TextStyle> = ({ typography }) => ({
    color: '#FFFFFF',
    marginLeft: 4,
    fontFamily: typography.primary.medium,
})

const $statsGrid: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
}

const $statCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    width: '48%',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})

const $statHeader: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
}

const $iconContainer: ViewStyle = {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
}

const $trendBadge: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
}

const $statValue: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    fontSize: 24,
    fontFamily: typography.secondary.bold,
    color: colors.text,
    marginBottom: 4,
})

const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
    fontSize: 12,
    color: colors.textDim,
})

const $sectionHeader: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
}

const $sectionTitle: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
    fontFamily: typography.secondary.bold,
    fontSize: 20,
    color: colors.text,
})

const $activityList: ViewStyle = {
    marginBottom: 20,
}

const $activityCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
})

const $activityIconWrapper: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
})

const $activityContent: ViewStyle = {
    flex: 1,
}

const $activityTopRow: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
}

const $activityTitle: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
    fontFamily: typography.primary.semiBold,
    fontSize: 14,
    color: colors.text,
})

const $activityTime: ThemedStyle<TextStyle> = ({ colors }) => ({
    fontSize: 10,
    color: colors.textDim,
})

const $activityDesc: ThemedStyle<TextStyle> = ({ colors }) => ({
    fontSize: 12,
    color: colors.textDim,
})

const $activityAmount: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    fontSize: 14,
    fontFamily: typography.primary.bold,
    color: colors.text,
    marginTop: 4,
})

const $fab: ThemedStyle<ViewStyle> = ({ colors }) => ({
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
})