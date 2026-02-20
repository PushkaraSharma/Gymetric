import { Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import { ThemedStyle } from '@/theme/types'
import React, { useCallback, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import HeaderbackButton from '@/components/HeaderbackButton'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { FontAwesome6, Ionicons } from '@expo/vector-icons'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { useAppDispatch } from '@/redux/Hooks'
import { setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { useFocusEffect } from '@react-navigation/native'
import { DEVICE_HEIGHT } from '@/utils/Constants'
import NoDataFound from '@/components/NoDataFound'
import { useAppTheme } from '@/theme/context'

const Memberships = () => {
    const dispatch = useAppDispatch();
    const { theme: { colors, spacing, isDark }, themed } = useAppTheme()

    const [memberships, setMemberships] = useState<{ [key: string]: any }[]>([]);

    const MembershipCards = ({ item }: { item: any }) => (
        <Pressable style={[themed($card), $styles.flexRow, { padding: spacing.sm, marginVertical: spacing.xs, opacity: item.active ? 1 : 0.5 }]} onPress={() => navigate('Create Edit Membership', { membership: item })}>
            <View style={{ flex: 1, maxWidth: '85%' }}>
                <Text preset={'formLabel'}>{item.planName}</Text>
                <View style={{ marginTop: 5, borderRadius: 6, backgroundColor: isDark ? colors.palette.slate800 : colors.palette.slate100, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text size='xxs' style={{ color: colors.textDim }}>{item.durationInDays ? `${item.durationInDays} Days` : `${item.durationInMonths} Months`}</Text>
                </View>
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
            <Header title='Memberships' backgroundColor={colors.surface} leftIcon="caretLeft" onLeftPress={goBack} />
            <View style={{ paddingTop: 10, flex: 1 }}>
                <ScrollView style={{ paddingHorizontal: 15, }}>
                    <Text style={{ marginBottom: 10 }}>Manage your gym's subscription plans</Text>
                    {
                        memberships.length > 0 ?
                            memberships.map((mem: any, index: number) => <MembershipCards key={index} item={mem} />) :
                            <View style={{ marginTop: DEVICE_HEIGHT * 0.25 }}>
                                <NoDataFound title='No memberships' msg='Please create membership plans' />
                            </View>
                    }
                </ScrollView>
                <View style={themed($footer)}>
                    <Button text={'Add New Membership'} preset="reversed" LeftAccessory={() => <FontAwesome6 name='circle-plus' size={20} color={colors.white} style={{ marginRight: 10 }} />} onPress={() => { navigate('Create Edit Membership') }} />
                </View>
            </View>
        </Screen>
    )
}

export default Memberships

const $footer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    borderTopWidth: 1,
    padding: spacing.md,
    borderColor: colors.border,
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})