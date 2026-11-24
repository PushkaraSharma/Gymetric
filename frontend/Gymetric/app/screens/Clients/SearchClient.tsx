import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import { goBack } from '@/navigators/navigationUtilities'
import { Ionicons } from '@expo/vector-icons'
import { TextField } from '@/components/TextField'
import { ThemedStyle } from '@/theme/types'
import { useAppTheme } from '@/theme/context'
import { useAppSelector } from '@/redux/Hooks'
import { selectAllClients } from '@/redux/state/GymStates'
import { Text } from '@/components/Text'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { TextInput } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import { startOfDay } from 'date-fns'
import { api } from '@/services/Api'

const SearchClient = ({ route, navigation }: any) => {
    const messaging = route?.params?.intent === 'message';
    const renewing = route?.params?.intent === 'renew';
    const [opening, setOpening] = useState<string | null>(null);

    // Same guards as the Renew button on the client profile; otherwise the profile explains why.
    const openRenew = async (item: any) => {
        setOpening(item._id);
        const response = await api.getClient(item._id);
        setOpening(null);
        if (response.kind !== 'ok') return;
        const client = response.data;
        const start = client?.activeMembership?.startDate ? startOfDay(new Date(client.activeMembership.startDate)) : null;
        if (client?.upcomingMembership || (start && start > startOfDay(new Date()))) {
            Toast.show({ type: 'info', text1: client?.upcomingMembership ? 'Already has an upcoming plan' : "Current plan hasn't started yet" });
            return navigation.replace('Client Profile', { data: { _id: item._id } });
        }
        navigation.replace('Renew Membership', { client });
    };
    const [searchText, setSearchText] = useState<string>('');
    const { theme: { colors }, themed } = useAppTheme();
    const inputRef = useRef<TextInput>(null);
    const clients = useAppSelector(selectAllClients);
    const search = searchText.trim().toLowerCase();
    const filteredClients = search ? clients?.filter((c) => c.name?.toLowerCase().includes(search) || c.phoneNumber?.includes(search)) : clients;

    const RenderItem = ({ item }: any) => (
        <Pressable style={[themed($item), $styles.flexRow]} onPress={() => {
            if (messaging) return navigation.replace('WhatsApp Chat', { memberId: item._id, name: item.name, phone: item.phoneNumber });
            if (renewing) return openRenew(item);
            route?.params?.handleSelect?.(route?.params?.index, 'add', item); goBack();
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ProfileInitialLogo name={item.name} imageUrl={item.profilePicture} />
                <View>
                    <Text weight='medium' size='md'>{item.name}</Text>
                    <Text size='xs'>{item.phoneNumber}</Text>
                </View>
            </View>
            {opening === item._id ? <ActivityIndicator color={colors.tint} /> : <Ionicons name='chevron-forward' size={20} color={colors.tintInactive} />}
        </Pressable>
    );
    useEffect(() => {
        const timeout = setTimeout(() => {
            inputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <Screen
            preset="fixed"
            contentContainerStyle={[$styles.flex1]}
            safeAreaEdges={["bottom"]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <Header safeAreaTop title={messaging ? 'Message a client' : renewing ? 'Renew a membership' : `Add Dependent ${route?.params?.index + 1}`} backgroundColor={colors.surface} leftAction={<Pressable style={[$styles.row, { paddingHorizontal: 10 }]} onPress={goBack}>
                <Ionicons name={'close'} size={25} color={colors.text} />
            </Pressable>} />
            <View style={{ flex: 1, paddingTop: 10 }}>
                <TextField
                    ref={inputRef}
                    value={searchText}
                    onChangeText={setSearchText}
                    inputWrapperStyle={themed($textField)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Search by name or phone number"
                    returnKeyType="search"
                    LeftAccessory={() => <Ionicons name='search' size={22} color={colors.tint} />}
                />
                <FlatList
                    data={filteredClients}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    renderItem={RenderItem}
                />
            </View>
        </Screen>
    )
}

export default SearchClient

const $textField: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    marginVertical: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingStart: 10,
    paddingVertical: 5,
    borderWidth: 1,
    marginHorizontal: 10,
    borderColor: colors.tint,
})

const $item: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    paddingVertical: 10,
    borderColor: colors.border,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
    margin: 5,
    marginHorizontal: 10,
    borderRadius: 10
})
