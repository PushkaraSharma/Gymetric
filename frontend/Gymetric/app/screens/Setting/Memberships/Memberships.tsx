import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import React, { useCallback, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import HeaderbackButton from '@/components/HeaderbackButton'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { colors } from '@/theme/colors'
import { FontAwesome6, Ionicons } from '@expo/vector-icons'
import { navigate } from '@/navigators/navigationUtilities'
import { spacing } from '@/theme/spacing'
import { useAppDispatch } from '@/redux/Hooks'
import { setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/api'
import { useFocusEffect } from '@react-navigation/native'
import { DEVICE_HEIGHT } from '@/utils/Constanst'
import NoDataFound from '@/components/NoDataFound'

const Memberships = () => {
    const dispatch = useAppDispatch();
    const [memberships, setMemberships] = useState<{ [key: string]: any }[]>([]);

    const MembershipCards = ({ item }: { item: any }) => (
        <Pressable style={[$styles.card, $styles.flexRow, { padding: spacing.sm, marginVertical: spacing.xs, opacity: item.active ? 1 : 0.5 }]} onPress={() => navigate('Create Edit Membership', { membership: item })}>
            <View style={{ flex: 1, maxWidth: '85%' }}>
                <Text preset={'formLabel'}>{item.planName}</Text>
                <Text size='xxs' style={styles.daysPill}>{item.durationInDays ? `${item.durationInDays} Days` : `${item.durationInMonths} Months`}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text preset='subheading' style={{ color: colors.tint, marginRight: 15 }}>₹{item.price}</Text>
                <Ionicons name='chevron-forward' size={20} color={colors.tintInactive} />
            </View>
        </Pressable>
    );

    const getMemberships = async () => {
        dispatch(setLoading({ loading: true }));
        const response = await api.allMemberships();
        if (response.kind === 'ok') {
            setMemberships(response.data);
        }
        dispatch(setLoading({ loading: false }));
    };

    useFocusEffect(
        useCallback(() => {
            getMemberships();
        }, [])
    );

    return (
        <Screen
            preset="fixed"
            safeAreaEdges={["bottom"]}
            contentContainerStyle={[$styles.flex1]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <Header title='Memberships' backgroundColor='#fff' LeftActionComponent={<HeaderbackButton />} />
            <View style={{ paddingTop: 10, flex: 1 }}>
                <ScrollView style={{ paddingHorizontal: 15, }}>
                    <Text>Manage your gym's subscription plans</Text>
                    {
                        memberships.length > 0 ?
                            memberships.map((mem: any, index: number) => <MembershipCards key={index} item={mem} />) :
                            <View style={{ marginTop: DEVICE_HEIGHT * 0.25 }}>
                                <NoDataFound title='No memberships' msg='Please create membership plans' />
                            </View>
                    }
                </ScrollView>
                <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
                    <Button text={'Add New Membership'} preset="reversed" LeftAccessory={() => <FontAwesome6 name='circle-plus' size={20} color={colors.background} style={{ marginRight: 10 }} />} onPress={() => { navigate('Create Edit Membership') }} />
                </View>
            </View>
        </Screen>
    )
}

export default Memberships

const styles = StyleSheet.create({
    daysPill: { marginTop: 5, borderRadius: 5, color: colors.textDim, alignSelf: 'flex-start', paddingHorizontal: 5, paddingVertical: 2, backgroundColor: colors.palette.lightgray }
})