import { Platform, Pressable, ScrollView, TextStyle, View, ViewStyle } from 'react-native'
import React, { JSX, useCallback, useEffect, useState } from 'react'
import { Drawer } from "react-native-drawer-layout"
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { useSafeAreaInsetsStyle } from '@/utils/useSafeAreaInsetsStyle'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { DrawerIconButton } from '../DemoShowroomScreen/DrawerIconButton'
import { Text } from "@/components/Text"
import { AntDesign, FontAwesome5, Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectGymInfo, setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect } from '@react-navigation/native'
import SideDrawer from './SideDrawer'

const Home = () => {
    const { themed } = useAppTheme();
    const dispatch = useAppDispatch();
    const gymInfo = useAppSelector(selectGymInfo);
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState<{ [key: string]: any } | null>(null);

    const $drawerInsets = useSafeAreaInsetsStyle(["top"]);
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
            <Text size='xxs' style={{ paddingLeft: 5, color: bgColor ? colors.tint : warning ? colors.error : colors.activeTxt }}>{value}</Text>
        </View>
    )

    const DashboardCard = (label: string, value: number, additional: string, warning: boolean, icon: JSX.Element,) => {
        return <View style={[$styles.card, { width: '48%', padding: spacing.md }]}>
            <View style={$styles.flexRow}>
                <Text>{label}</Text>
                {icon}
            </View>
            <Text preset='heading' style={{ marginBottom: 5 }}>{value}</Text>
            {growthLabel(additional, warning)}
        </View>
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

    return (
        <Drawer
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            drawerType="back"
            drawerPosition={'left'}
            renderDrawerContent={() => <SideDrawer/>}
        >
            <Screen
                preset="fixed"
                safeAreaEdges={["top"]}
                contentContainerStyle={$styles.flex1}
                {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
            >
                <DrawerIconButton onPress={toggleDrawer} />
                <ScrollView style={{ paddingHorizontal: 15 }}>
                    <View>
                        <Text preset="heading" style={{}}>Dashboard</Text>
                        <Text preset='formHelper' style={themed({ color: colors.textDim })}>Good morning, {gymInfo?.ownerName} 👋</Text>
                    </View>
                    <View style={[$styles.flexRow]}>
                        {DashboardCard('Total Clients', summary?.totalClients ?? 0, '+5%', false,
                            <View style={{ backgroundColor: colors.palette.primary100, padding: 5, borderRadius: 20 }}>
                                <Ionicons name='people' size={20} color={colors.palette.primary500} />
                            </View>
                        )}
                        {DashboardCard('Active', summary?.activeMembers ?? 0, '+12%', false,
                            <View style={{ backgroundColor: colors.activeBg, padding: 5, borderRadius: 20 }}>
                                <FontAwesome5 name='running' size={20} color={colors.activeTxt} />
                            </View>
                        )}
                    </View>
                    <View style={[$styles.card, themed($mainCard)]}>
                        <View style={[$styles.flexRow, { alignItems: 'flex-start' }]}>
                            <View>
                                <Text style={themed($textColor)}>Revenue this month</Text>
                                <Text preset='heading' style={themed({ color: colors.background })}>₹{summary?.revenueThisMonth ?? 0}</Text>
                            </View>
                            <View style={themed({ backgroundColor: '#ffffff47', padding: 8, borderRadius: 20 })}>
                                <Ionicons name='cash' size={25} color={'#fff'} />
                            </View>
                        </View>
                        <View style={{ marginTop: 15, flexDirection: 'row', alignItems: 'center' }}>
                            {growthLabel('+8%', false, '#fff')}
                            <Text style={themed({ color: colors.background, marginLeft: 10 })} size='xs'>Target: ₹15,000</Text>
                        </View>
                    </View>
                    <View style={[$styles.flexRow]}>
                        {DashboardCard('Attendence', 142, '+5%', false,
                            <View style={{ backgroundColor: colors.palette.primary100, padding: 5, borderRadius: 20 }}>
                                <Ionicons name='people' size={20} color={colors.palette.primary500} />
                            </View>
                        )}
                        {DashboardCard('Expiring', summary?.expiringIn7Days ?? 0, 'Renewals needed', true,
                            <View style={{ backgroundColor: colors.errorBackground, padding: 5, borderRadius: 20 }}>
                                <Ionicons name='warning' size={20} color={colors.error} />
                            </View>
                        )}
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


const $drawer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.background,
    flex: 1,
})

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