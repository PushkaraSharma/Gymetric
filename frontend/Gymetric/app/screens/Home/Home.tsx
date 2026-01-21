import { Platform, Pressable, ScrollView, TextStyle, View, ViewStyle } from 'react-native'
import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react'
import { Drawer } from "react-native-drawer-layout"
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from "@/components/Text"
import { AntDesign, Feather, FontAwesome5, Ionicons, Octicons } from '@expo/vector-icons'
import { colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectGymInfo, setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect } from '@react-navigation/native'
import SideDrawer from './SideDrawer'
import { DrawerIconButton } from '@/components/DrawerIconButton'
import { getGreeting } from '@/utils/Helper'
import { BG_ACTIVITY_COLOR } from '@/utils/Constanst'
import { formatDistanceToNow } from 'date-fns'

const Home = () => {
    const { themed } = useAppTheme();
    const dispatch = useAppDispatch();
    const gymInfo = useAppSelector(selectGymInfo);
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState<{ [key: string]: any } | null>(null);
    const greeting = useMemo(() => getGreeting(), []);

    const ActivityIcon: {[key: string]: JSX.Element} = {
        'ONBOARDING' : <Octicons name='person-add' size={20} color={colors.activeTxt}/>,
        'RENEWAL': <Feather name='refresh-cw' size={20} color={colors.tint}/>, 
        'EXPIRY': <Ionicons name='warning' size={20} color={colors.error}/> ,
        'PAYMENT': <Ionicons name='cash' size={20} color={colors.activeTxt}/> , 
        'ADVANCE_RENEWAL': <Feather name='refresh-cw' size={20} color={colors.tint}/>
    };

    const toggleDrawer = useCallback(() => {
        if (!open) {
            setOpen(true)
        } else {
            setOpen(false)
        }
    }, [open]);

    const growthLabel = (value: string, warning: boolean = false, bgColor?: any) => (
        <View style={[themed($growthLabel), warning && { backgroundColor: colors.errorBackground }, bgColor && { backgroundColor: bgColor }]}>
            {!warning && <AntDesign name='rise' color={bgColor ? colors.tint : colors.activeTxt} size={15} />}
            <Text size='xxs' style={{ paddingLeft: 5, color: bgColor ? colors.tint : warning ? colors.error : colors.activeTxt }}>{value == null ? '--' : `${value}${warning ? '' : ' %'}`}</Text>
        </View>
    )

    const DashboardCard = (label: string, value: number, trendValue: string | null, trendLabel: string | null, warning: boolean, icon: JSX.Element,) => {
        return <View style={[$styles.card, { width: '48%', padding: spacing.md }]}>
            <View style={$styles.flexRow}>
                <Text>{label}{label === 'Expiring' && <Text size='xxs' style={{ color: colors.textDim }}> 7 days</Text>}</Text>
                {icon}
            </View>
            <Text preset='heading' style={{ marginBottom: 5 }}>{value}</Text>
            {(trendLabel || warning) && <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {growthLabel(trendValue!, warning)}
                <Text size='xxs' style={{ color: colors.textDim, marginLeft: 5 }}>{trendLabel}</Text>
            </View>
            }
        </View>
    };

    const ActivityCard = ({ item }: { item: any }) => (
        <View style={[$styles.card, $styles.flexRow, { padding: spacing.sm, marginVertical: spacing.xs }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: BG_ACTIVITY_COLOR[item?.type], padding: 8, borderRadius: 5, marginRight: 15 }}>
                    {ActivityIcon[item?.type]}
                </View>
                <View style={{ flex: 1 }}>
                    <View style={$styles.flexRow}>
                        <Text weight='medium'>{item?.title}</Text>
                        <Text size='xxs' style={{ color: colors.textDim }}>{formatDistanceToNow(item?.createdAt, {addSuffix: true}).replace("minutes", "min").replace("minute", "min")}</Text>
                    </View>
                    <View style={$styles.flexRow}>
                        <Text style={{ color: colors.textDim, maxWidth: item?.amount ? '80%' : '100%' }} size='xs'>{item?.description}</Text>
                        {!!item?.amount && <Text>₹{item?.amount}</Text>}
                    </View>
                </View>
            </View>
        </View>
    );

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

    return (
        <Drawer
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            drawerType="back"
            drawerPosition={'left'}
            renderDrawerContent={() => <SideDrawer />}
        >
            <Screen
                preset="fixed"
                safeAreaEdges={["top"]}
                contentContainerStyle={$styles.flex1}
                {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
            >
                <DrawerIconButton onPress={toggleDrawer} />
                <ScrollView style={{ paddingHorizontal: 15 }} showsVerticalScrollIndicator={false}>
                    <View>
                        <Text preset="heading" style={{}}>Dashboard</Text>
                        <Text preset='formHelper' style={themed({ color: colors.textDim })}>{greeting}, {gymInfo?.ownerName} 👋</Text>
                    </View>
                    <View style={[$styles.flexRow, { alignItems: 'stretch' }]}>
                        {DashboardCard('Total Clients', summary?.totalClients ?? 0, null, '', false,
                            <View style={{ backgroundColor: colors.palette.primary100, padding: 5, borderRadius: 20 }}>
                                <Ionicons name='people' size={20} color={colors.palette.primary500} />
                            </View>
                        )}
                        {DashboardCard('Active', summary?.activeMembers?.value ?? 0, summary?.activeMembers?.trend, summary?.activeMembers?.comparisonText, false,
                            <View style={{ backgroundColor: colors.activeBg, padding: 5, borderRadius: 20 }}>
                                <FontAwesome5 name='running' size={20} color={colors.activeTxt} />
                            </View>
                        )}
                    </View>
                    <View style={[$styles.card, themed($mainCard)]}>
                        <View style={[$styles.flexRow, { alignItems: 'flex-start' }]}>
                            <View>
                                <Text style={themed($textColor)}>Revenue this month</Text>
                                <Text preset='heading' style={themed({ color: colors.background })}>₹{summary?.revenueThisMonth?.value ?? 0}</Text>
                            </View>
                            <View style={themed({ backgroundColor: '#ffffff47', padding: 8, borderRadius: 20 })}>
                                <Ionicons name='cash' size={25} color={'#fff'} />
                            </View>
                        </View>
                        <View style={[$styles.flexRow, { marginTop: 15 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {growthLabel(summary?.revenueThisMonth?.trend, false, '#fff')}
                                <Text size='xxs' style={{ color: colors.background, marginLeft: 5 }}>{summary?.revenueThisMonth?.comparisonText}</Text>
                            </View>
                            <Text style={themed({ color: colors.background, marginLeft: 10 })} size='xs'>Target: ₹--</Text>
                        </View>
                    </View>
                    <View style={[$styles.flexRow]}>
                        {DashboardCard('New Joinees', summary?.newlyJoinedThisMonth?.value, summary?.newlyJoinedThisMonth?.trend, summary?.newlyJoinedThisMonth?.comparisonText, false,
                            <View style={{ backgroundColor: colors.palette.primary100, padding: 5, borderRadius: 20 }}>
                                <Ionicons name='people' size={20} color={colors.palette.primary500} />
                            </View>
                        )}
                        {DashboardCard('Expiring', summary?.expiringIn7Days ?? 0, 'Renewals needed', null, true,
                            <View style={{ backgroundColor: colors.errorBackground, padding: 5, borderRadius: 20 }}>
                                <Ionicons name='warning' size={20} color={colors.error} />
                            </View>
                        )}
                    </View>
                    <View style={{ marginTop: 10 }}>
                        <Text preset='subheading'>Recent Activity</Text>
                        {
                            summary?.activities.map((activity: any, index: number) => <ActivityCard item={activity} key={index} />)
                        }
                    </View>
                </ScrollView>
                <Pressable style={themed($addBtn)} onPress={() => { navigate('Add Client') }}>
                    <Ionicons name='add' size={30} color={colors.background} />
                </Pressable>
            </Screen>
        </Drawer>
    )
}

export default Home

const $addBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    backgroundColor: colors.tint,
    position: 'absolute',
    right: 20,
    bottom: 0,
    borderRadius: 30,
    padding: 10,
    elevation: 1,
    shadowOffset: {
        width: 0,
        height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowColor: '#000',
    marginBottom: 5

})

const $growthLabel: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.activeBg,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: 5,
    alignSelf: 'flex-start',
    flexDirection: 'row',
})

const $mainCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.palette.primary500,
    padding: spacing.md
})

const $textColor: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
    color: colors.background
})