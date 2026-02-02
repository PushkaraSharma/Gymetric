import { Image, Platform, Pressable, ScrollView, StyleSheet, View, Linking } from 'react-native'
import React, { useCallback, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { useAppDispatch } from '@/redux/Hooks'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { Feather, Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons'
import { setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { Text } from '@/components/Text'
import { differenceInCalendarDays, formatDate, startOfDay, parseISO } from 'date-fns';
import { Button } from '@/components/Button'
import HeaderbackButton from '@/components/HeaderbackButton'
import { useFocusEffect } from '@react-navigation/native'
import { DEVICE_HEIGHT } from '@/utils/Constants'
import NoDataFound from '@/components/NoDataFound'
import Toast from 'react-native-toast-message'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'


const ClientDetails = ({ route }: any) => {
    const { theme: { colors, spacing }, themed } = useAppTheme()
    const dispatch = useAppDispatch();

    const [client, setClient] = useState<{ [key: string]: any } | null>(null);
    const [membershipDays, setMembershipDays] = useState<{ total: number, remain: number, used: number, progress: number, endDate: string }>({ total: 0, remain: 0, used: 0, progress: 0, endDate: '-' })
    const [tab, setTab] = useState<'Memberships' | 'Payments'>('Memberships');

    const getDaysProgress = (startStr: string, endStr: string) => {
        if (!startStr || !endStr) return;
        const start = startOfDay(parseISO(startStr));
        const end = startOfDay(parseISO(endStr));
        const today = startOfDay(new Date());
        const total = differenceInCalendarDays(end, start) + 1; // Total duration
        let used = 0;
        let remain = 0;
        if (today < start) {
            // Future
            used = 0;
            remain = total;
        } else {
            // Started
            remain = Math.max(0, differenceInCalendarDays(end, today)); // Remaining days from today
            used = Math.min(total, Math.max(0, differenceInCalendarDays(today, start) + 1));
        }
        const progress = total > 0 ? used / total : 0;
        setMembershipDays({ total, remain, used, progress: Math.min(Math.max(progress, 0), 1), endDate: formatDate(end, 'MMM dd, yyyy') });
    };

    const clientInfo = async () => {
        dispatch(setLoading({ loading: true }));
        const response = await api.getClient(route?.params?.data?._id);
        if (response.kind === 'ok') {
            setClient(response.data);
            const displayMembership = response.data.activeMembership || response.data.upcomingMembership;
            if (displayMembership) {
                getDaysProgress(displayMembership.startDate, displayMembership.endDate);
            }
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
        <View key={index} style={[themed($card), $styles.flexRow, { padding: spacing.sm, marginVertical: spacing.xs }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: colors.palette.indigo100, padding: 8, borderRadius: 5, marginRight: 15 }}>
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
                leftIcon="caretLeft"
                onLeftPress={goBack}
                RightActionComponent={
                    <Pressable style={themed([$styles.row, { paddingHorizontal: 10 }])} onPress={() => { navigate('Update Basic Information', { client }) }}>
                        <MaterialIcons name={'edit'} size={25} color={colors.text} />
                    </Pressable>
                }
                backgroundColor={colors.surface}
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                <View style={{ marginVertical: spacing.md, alignItems: 'center', paddingHorizontal: 15 }}>
                    <Pressable
                        onPress={() => { navigate('Update Basic Information', { client }) }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                    >
                        <View style={[{ marginBottom: spacing.md, borderRadius: 80, padding: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, $styles.shadow]}>
                            <ProfileInitialLogo
                                name={client?.name ?? ''}
                                size={80}
                                imageUrl={client?.profilePicture}
                                sideMargin={false}
                            />
                        </View>
                    </Pressable>
                    <Text weight='semiBold' size='xl'>{client?.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={themed({ marginRight: 15, backgroundColor: ['active'].includes(client?.membershipStatus) ? colors.activeBg : ['trial', 'future'].includes(client?.membershipStatus) ? colors.palette.indigo200 : colors.errorBackground, paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: 20 })}>
                            <Text size='xs' weight='medium' style={themed({ color: ['active'].includes(client?.membershipStatus) ? colors.activeTxt : ['trial', 'future'].includes(client?.membershipStatus) ? colors.tint : colors.error, textTransform: 'capitalize' })}>{client?.membershipStatus}</Text>
                        </View>
                        <Text size='xs' style={{ color: colors.textDim }}>Member since {client ? formatDate(client?.createdAt, 'MMM yyyy') : '-'}</Text>
                    </View>
                </View>
                <View style={[$styles.flexRow, { justifyContent: 'space-around', paddingHorizontal: 15 }]}>
                    <Button text='Whatsapp' onPress={() => { openWhatsAppChat(client?.phoneNumber) }} style={styles.actionBtn} LeftAccessory={() => <Ionicons name="logo-whatsapp" size={20} style={{ marginRight: 10 }} color={colors.text} />} />
                    <Button text='Call' onPress={() => { callNumber(client?.phoneNumber) }} style={styles.actionBtn} LeftAccessory={() => <Feather name="phone" size={20} style={{ marginRight: 10 }} color={colors.text} />} />
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
                            {/* Logic: Show Active OR Upcoming as the "Main" card. If Active exists, it takes precedence. If only Upcoming, show that. */}
                            {(() => {
                                const displayMembership = client?.activeMembership || client?.upcomingMembership;
                                return (
                                    <>
                                        {/* If we are showing Active, and there is ALSO an Upcoming, we might want a small text or just show the Active one primarily */}
                                        {client?.activeMembership && client?.upcomingMembership && <Text style={{ color: colors.tint, marginBottom: 10 }} weight='medium'>Upcoming plan starts on {formatDate(client?.upcomingMembership?.startDate ?? new Date(), 'dd MMM yyyy')}</Text>}

                                        <Text preset='subheading'>{displayMembership ? (client?.activeMembership ? 'Current Plan' : 'Upcoming Plan') : 'Membership'}
                                            {displayMembership && membershipDays?.used === 0 && <Text size='xs' style={themed({ color: colors.tint })}>(Will start from {formatDate(displayMembership?.startDate, 'dd MMM')})</Text>}
                                        </Text>

                                        {displayMembership ?
                                            <View style={[themed($card), { padding: 0, marginVertical: spacing.xxs }]}>
                                                <View style={themed($dependentPill)}>
                                                    <Text size='xs' style={{ color: colors.tint, textTransform: 'capitalize' }}>{client?.role}</Text>
                                                </View>
                                                <View style={{ borderTopEndRadius: 10, overflow: 'hidden', borderTopStartRadius: 10 }}>
                                                    <Image source={require('../../../assets/images/membershipImage.jpg')} style={{ height: 150 }} />
                                                </View>
                                                <View style={{ padding: spacing.md }}>
                                                    <View style={[$styles.flexRow, { marginBottom: 10 }]}>
                                                        <View>
                                                            <View style={[$styles.flexRow, { width: '100%' }]}>
                                                                <Text preset='subheading'>{displayMembership?.planName ?? 'Membership Plan'}</Text>
                                                                {client?.role === 'dependent' && <Text size='xs' style={{ color: colors.textDim }}>Paid by {displayMembership?.primaryMemberId?.name}</Text>}
                                                            </View>
                                                            <Text style={{ color: colors.textDim }}>{displayMembership?.description ?? "Full access to all facilities"}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={$styles.flexRow}>
                                                        <Text>Days Utilised</Text>
                                                        <Text weight='semiBold' style={{ color: membershipDays?.remain > 0 ? colors.tint : colors.error }}>{`${membershipDays?.used} / ${membershipDays?.total}`} days</Text>
                                                    </View>
                                                    <View style={{ height: 8, backgroundColor: 'lightgray', borderRadius: 4, marginTop: 5, marginBottom: 15 }}>
                                                        <View style={{ height: 8, width: `${(membershipDays?.progress || 0) * 100}%`, backgroundColor: membershipDays?.remain > 0 ? colors.tint : colors.error, borderRadius: 4, }}
                                                        />
                                                    </View>
                                                    <View style={[$styles.flexRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: 10 }]}>
                                                        <View>
                                                            <Text weight='medium' style={{ color: membershipDays?.remain > 0 ? colors.textDim : colors.error }}>{membershipDays?.remain > 0 ? "Expires On" : "Expired On"}</Text>
                                                            <Text weight='medium' size='md'>{membershipDays?.endDate}</Text>
                                                        </View>
                                                        <Button disabled={membershipDays?.used === 0 && client?.activeMembership} text={"Renew"} style={themed({ minHeight: 45, borderRadius: 10, backgroundColor: membershipDays?.remain > 0 ? colors.tint : colors.error, width: '45%' })} disabledStyle={{ opacity: 0.4 }} preset="reversed" onPress={() => { client?.upcomingMembership ? Toast.show({ type: 'error', text1: 'Client already have upcoming plan' }) : navigate('Renew Membership', { client: client }) }} />
                                                    </View>
                                                </View>
                                            </View> :
                                            <View style={{ marginTop: DEVICE_HEIGHT * 0.1 }}>
                                                <NoDataFound title='No active membership' msg='Client does not have an active or upcoming plan' />
                                            </View>
                                        }
                                    </>
                                );
                            })()}

                            {/* Past Memberships Section */}
                            {client?.membershipHistory && client?.membershipHistory.filter((m: any) => m._id !== client?.activeMembership?._id && m._id !== client?.upcomingMembership?._id).length > 0 && (
                                <View style={{ marginTop: spacing.lg }}>
                                    <Text preset='subheading' style={{ marginBottom: spacing.xs }}>Past Memberships</Text>
                                    {client.membershipHistory
                                        .filter((m: any) => m._id !== client?.activeMembership?._id && m._id !== client?.upcomingMembership?._id)
                                        .map((historyItem: any, index: number) => (
                                            <View key={index} style={[themed($card), { marginBottom: spacing.sm, padding: spacing.sm }]}>
                                                <View style={$styles.flexRow}>
                                                    <View>
                                                        <Text weight='semiBold'>{historyItem.planName}</Text>
                                                        <Text size='xs' style={{ color: colors.textDim }}>
                                                            {formatDate(historyItem.startDate, 'MMM dd, yyyy')} - {formatDate(historyItem.endDate, 'MMM dd, yyyy')}
                                                        </Text>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text weight='medium' style={{ color: historyItem.status === 'expired' ? colors.textDim : colors.tint }}>{historyItem.status}</Text>
                                                        {/*<Text size='xs'>₹{historyItem.totalAmount}</Text>*/}
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    }
                                </View>
                            )}
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
    actionBtn: { width: '45%', minHeight: 45, borderWidth: 1, borderRadius: 10 }
})

import { ThemedStyle } from "@/theme/types"
import { ViewStyle } from "react-native"

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})

const $dependentPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    borderRadius: 10,
    backgroundColor: colors.palette.indigo100,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    zIndex: 1,
    right: 10,
    top: 10,
    borderWidth: 0.5,
    borderColor: colors.tint
})