import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { useAppDispatch } from '@/redux/Hooks'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { FontAwesome5, Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons'
import { spacing } from '@/theme/spacing'
import { colors } from '@/theme/colors'
import { setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/api'
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

    const getDaysProgress = (start: Date, end: Date) => {
        const today = new Date();
        const total = differenceInCalendarDays(end, start);
        const remain = isAfter(today, end) ? 0 : differenceInCalendarDays(end, today);
        const used = total - remain;
        const progress = used / total;
        setMembershipDays({ total, remain, used, progress });
    };

    const clientInfo = async () => {
        dispatch(setLoading({ loading: true }));
        const response = await api.getClient(route?.params?.data?._id);
        if (response.kind === 'ok') {
            setClient(response.data);
            const latestMem = response.data.membershipHistory?.[0];
            getDaysProgress(latestMem?.startDate, latestMem?.endDate);
        }
        dispatch(setLoading({ loading: false }));
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
            <ScrollView style={{ paddingHorizontal: 15 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}>
                <View style={{ marginVertical: spacing.lg, alignItems: 'center' }}>
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
                <View>
                    <Text preset='subheading'>Contact Information</Text>
                    <View style={[$styles.card, { padding: spacing.md }]}>
                        <View style={[$styles.flexRow, { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, borderColor: colors.border }]}>
                            <View>
                                <Text style={{ color: colors.textDim }}>Phone Number</Text>
                                <Text>{client?.phoneNumber ?? '-'}</Text>
                            </View>
                            <FontAwesome5 name='phone' size={25} color={colors.tint} />
                        </View>
                        <View style={[$styles.flexRow, { paddingTop: 10, borderColor: colors.border }]}>
                            <View>
                                <Text style={{ color: colors.textDim }}>Birthday</Text>
                                <Text>{client?.birthday ? formatDate(client?.birthday, 'dd MMM') : '-'}</Text>
                            </View>
                            <View>
                                <Text style={{ color: colors.textDim }}>Age</Text>
                                <Text>{client?.age ?? '-'}</Text>
                            </View>
                            <View>
                                <Text style={{ color: colors.textDim }}>Gender</Text>
                                <Text>{client?.gender}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View>
                    <Text preset='subheading'>Active Plan</Text>
                    <View style={[$styles.card, { padding: 0 }]}>
                        <View style={{ borderTopEndRadius: 10, overflow: 'hidden', borderTopStartRadius: 10 }}>
                            <Image source={require('../../../../assets/images/membershipImage.jpg')} style={{ height: 150 }} />
                        </View>
                        <View style={{ padding: spacing.md }}>
                            <View style={[$styles.flexRow, { marginBottom: 10 }]}>
                                <View>
                                    <Text preset='subheading'>{client?.membershipHistory?.[0]?.planName ?? 'Pro Monthly Plan'}</Text>
                                    <Text style={{ color: colors.textDim }}>Full access to all facilities</Text>
                                </View>
                            </View>
                            <View style={$styles.flexRow}>
                                <Text>Days Remaining</Text>
                                <Text weight='semiBold' style={{ color: colors.tint }}>{`${membershipDays?.used} / ${membershipDays?.total}`} days</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: 'lightgray', borderRadius: 4, marginTop: 5, marginBottom: 15 }}>
                                <View style={{ height: 8, width: `${membershipDays.progress * 100}%`, backgroundColor: colors.tint, borderRadius: 4, }}
                                />
                            </View>
                            <View style={[$styles.flexRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: 10 }]}>
                                <View>
                                    <Text weight='medium' style={{ color: colors.textDim }}>{membershipDays?.remain > 0 ? "Expires On" : "Expired On"}</Text>
                                    <Text weight='medium' size='md'>{client?.currentMembershipEndDate ? formatDate(client?.currentMembershipEndDate, 'MMM dd, yyyy') : '-'}</Text>
                                </View>
                                <Button text={"Renew"} style={themed({ minHeight: 45, borderRadius: 10, backgroundColor: colors.tint })} preset="reversed" onPress={() => { }} />
                            </View>
                        </View>
                    </View>
                </View>
                <View>
                    <Text preset='subheading'>Recent Payments</Text>
                    {client?.paymentHistory.map((payment: any, index: number) => RenderPayment(payment, index))}
                </View>
            </ScrollView>
        </Screen>
    )
}

export default ClientDetails

const styles = StyleSheet.create({})