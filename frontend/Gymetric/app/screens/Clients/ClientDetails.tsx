import { Image, Platform, Pressable, ScrollView, StyleSheet, View, Linking } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { useAppDispatch } from '@/redux/Hooks'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { Feather, FontAwesome5, Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons'
import { spacing } from '@/theme/spacing'
import { colors } from '@/theme/colors'
import { setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { Text } from '@/components/Text'
import { differenceInCalendarDays, isAfter, formatDate } from 'date-fns';
import { Button } from '@/components/Button'
import HeaderbackButton from '@/components/HeaderbackButton'
import { useFocusEffect } from '@react-navigation/native'

const ClientDetails = ({ navigation, route }: any) => {
    const { themed } = useAppTheme();
    const dispatch = useAppDispatch();

    const [client, setClient] = useState<{ [key: string]: any } | null>(null);
    const [membershipDays, setMembershipDays] = useState<{ total: number, remain: number, used: number, progress: number }>({ total: 0, remain: 0, used: 0, progress: 0 })
    const [tab, setTab] = useState<'Memberships' | 'Payments'>('Memberships');

    const getDaysProgress = (start: Date, end: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0);
        const total = differenceInCalendarDays(endDate, startDate) + 1;
        const remain = isAfter(today, endDate) ? 0 : differenceInCalendarDays(endDate, today);
        const used = total - remain;
        const progress = used / total;
        setMembershipDays({ total, remain, used, progress });
    };

    const clientInfo = async () => {
        dispatch(setLoading({ loading: true }));
        const response = await api.getClient(route?.params?.data?._id);
        if (response.kind === 'ok') {
            setClient(response.data);
            const activeMembership = response.data.activeMembership;
            getDaysProgress(activeMembership?.startDate, activeMembership?.endDate);
        }
        dispatch(setLoading({ loading: false }));
    };

    const callNumber = async (phoneNumber: string) => {
        const url = `tel:${phoneNumber}`
        await Linking.openURL(url)
    };

    const openWhatsAppChat = async (phoneNumber: string, message = "") => {
        const formattedNumber = phoneNumber.replace(/\D/g, "");
        const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    };

    const RenderPayment = (payment: any, index: number) => (
        <View key={index} style={[$styles.card, $styles.flexRow, { padding: spacing.sm, marginVertical: spacing.xs }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: colors.palette.accent100, padding: 8, borderRadius: 5, marginRight: 15 }}>
                    <Ionicons name='receipt' size={20} color={colors.tint} />
                </View>
                <View>
                    <Text weight='medium'>{payment?.remarks ?? 'Membership'} ( {payment?.method} )</Text>
                    <Text style={{ color: colors.textDim }} size='xs'>{formatDate(payment?.date, 'MMM dd, yyyy')}</Text>
                </View>
            </View>
            <Text preset='subheading'>₹{payment?.amount}</Text>
        </View>
    );

    useFocusEffect(
        useCallback(() => {
            clientInfo();
        }, [])
    );

    return (
        <Screen
            preset="fixed"
            contentContainerStyle={[$styles.flex1]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <Header title='Client Profile'
                LeftActionComponent={<HeaderbackButton />}
                RightActionComponent={
                    <Pressable style={themed([$styles.row, { paddingHorizontal: 10 }])} onPress={() => { navigate('Update Basic Information', { client }) }}>
                        <MaterialIcons name={'edit'} size={25} />
                    </Pressable>
                }
                backgroundColor="#fff"
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                <View style={{ marginVertical: spacing.md, alignItems: 'center', paddingHorizontal: 15 }}>
                    <View style={[{ marginBottom: spacing.md, borderRadius: 40, padding: spacing.sm, backgroundColor: colors.tintInactive, borderWidth: 4, borderColor: '#fff' }, $styles.shadow]}>
                        <Octicons name='person' size={50} />
                    </View>
                    <Text weight='semiBold' size='xl'>{client?.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={themed({ marginRight: 15, backgroundColor: client?.membershipStatus === 'active' ? colors.activeBg : client?.membershipStatus === 'trial' ? colors.palette.accent200 : colors.errorBackground, paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: 20 })}>
                            <Text size='xs' weight='medium' style={themed({ color: client?.membershipStatus === 'active' ? colors.activeTxt : client?.membershipStatus === 'trial' ? colors.tint : colors.error, textTransform: 'capitalize' })}>{client?.membershipStatus}</Text>
                        </View>
                        <Text size='xs' style={{ color: colors.textDim }}>Member since {client ? formatDate(client?.createdAt, 'MMM yyyy') : '-'}</Text>
                    </View>
                </View>
                <View style={[$styles.flexRow, { justifyContent: 'space-around', paddingHorizontal: 15 }]}>
                    <Button text='Whatsapp' onPress={() => { openWhatsAppChat(client?.phoneNumber) }} style={styles.actionBtn} LeftAccessory={() => <Ionicons name="logo-whatsapp" size={20} style={{ marginRight: 10 }} />} />
                    <Button text='Call' onPress={() => { callNumber(client?.phoneNumber) }} style={styles.actionBtn} LeftAccessory={() => <Feather name="phone" size={20} style={{ marginRight: 10 }} />} />
                </View>
                <View style={[$styles.flexRow, { borderBottomWidth: 0.5, borderColor: colors.border, marginVertical: spacing.lg, justifyContent: 'space-around' }]}>
                    {
                        ['Memberships', 'Payments'].map((type: string, index: number) => (
                            <Pressable key={index} style={{ borderBottomWidth: 3, paddingBottom: 5, paddingHorizontal: 15, borderColor: type === tab ? colors.tint : colors.background }} onPress={() => { setTab(type as 'Payments') }}>
                                <Text weight={'semiBold'} style={{ color: type === tab ? colors.text : colors.textDim }}>{type}</Text>
                            </Pressable>
                        ))
                    }
                </View>
                {
                    tab === 'Memberships' ?
                        <View style={{ paddingHorizontal: 15 }}>
                            {client?.upcomingMembership && <Text style={{color: colors.tint, marginBottom: 10}} weight='medium'>Upcoming plan starts on {formatDate(client?.upcomingMembership?.startDate ??  new Date(), 'dd MMM yyyy')}</Text>}
                            <Text preset='subheading'>Current Plan {client && membershipDays?.used === 0 && <Text size='xs' style={themed({ color: colors.tint })}>(Will start from {formatDate(client?.activeMembership?.startDate, 'dd MMM')})</Text>}</Text>
                            <View style={[$styles.card, { padding: 0, marginVertical: spacing.xxs }]}>
                                <View style={{ borderTopEndRadius: 10, overflow: 'hidden', borderTopStartRadius: 10 }}>
                                    <Image source={require('../../../assets/images/membershipImage.jpg')} style={{ height: 150 }} />
                                </View>
                                <View style={{ padding: spacing.md }}>
                                    <View style={[$styles.flexRow, { marginBottom: 10 }]}>
                                        <View>
                                            <Text preset='subheading'>{client?.activeMembership?.planName ?? 'Pro Monthly Plan'}</Text>
                                            <Text style={{ color: colors.textDim }}>{client?.activeMembership?.description ?? "Full access to all facilities"}</Text>
                                        </View>
                                    </View>
                                    <View style={$styles.flexRow}>
                                        <Text>Days Utilised</Text>
                                        <Text weight='semiBold' style={{ color: membershipDays?.remain > 0 ? colors.tint : colors.error }}>{`${membershipDays?.used} / ${membershipDays?.total}`} days</Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: 'lightgray', borderRadius: 4, marginTop: 5, marginBottom: 15 }}>
                                        <View style={{ height: 8, width: `${membershipDays.progress * 100}%`, backgroundColor: membershipDays?.remain > 0 ? colors.tint : colors.error, borderRadius: 4, }}
                                        />
                                    </View>
                                    <View style={[$styles.flexRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: 10 }]}>
                                        <View>
                                            <Text weight='medium' style={{ color: membershipDays?.remain > 0 ? colors.textDim : colors.error }}>{membershipDays?.remain > 0 ? "Expires On" : "Expired On"}</Text>
                                            <Text weight='medium' size='md'>{client?.currentEndDate ? formatDate(client?.currentEndDate, 'MMM dd, yyyy') : '-'}</Text>
                                        </View>
                                        <Button disabled={membershipDays?.used === 0} text={"Renew"} style={themed({ minHeight: 45, borderRadius: 10, backgroundColor: membershipDays?.remain > 0 ? colors.tint : colors.error, width: '45%' })} disabledStyle={{ opacity: 0.4 }} preset="reversed" onPress={() => {navigate('Renew Membership', {client: client})}} />
                                    </View>
                                </View>
                            </View>
                        </View> :
                        <View style={{ paddingHorizontal: 15 }}>
                            <Text preset='subheading'>Past Transactions</Text>
                            {client?.paymentHistory.map((payment: any, index: number) => RenderPayment(payment, index))}
                        </View>
                }
            </ScrollView>
        </Screen>
    )
}

export default ClientDetails

const styles = StyleSheet.create({
    actionBtn: { width: '45%', minHeight: 45, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 }
})