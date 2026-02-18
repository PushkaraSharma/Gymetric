import { FlatList, Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
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

const SearchClient = ({ route }: any) => {
    const [searchText, setSearchText] = useState<string>('');
    const { theme: { colors }, themed } = useAppTheme();
    const inputRef = useRef<TextInput>(null);
    const clients = useAppSelector(selectAllClients);
    const search = searchText.trim().toLowerCase();
    const filteredClients = search ? clients?.filter((c) => c.name?.toLowerCase().includes(search) || c.phoneNumber?.includes(search)) : clients;

    const RenderItem = ({ item }: any) => (
        <Pressable style={[themed($item), $styles.flexRow]} onPress={() => { route?.params?.handleSelect?.(route?.params?.index, 'add', item); goBack(); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ProfileInitialLogo name={item.name} imageUrl={item.profilePicture} />
                <View>
                    <Text weight='medium' size='md'>{item.name}</Text>
                    <Text size='xs'>{item.phoneNumber}</Text>
                </View>
            </View>
            <Ionicons name='chevron-forward' size={20} color={colors.tintInactive} />
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
            <Header title={`Add Dependent ${route?.params?.index + 1}`} backgroundColor={colors.surface} LeftActionComponent={<Pressable style={[$styles.row, { paddingHorizontal: 10 }]} onPress={goBack}>
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
                    placeholder="Seach by name or phone number"
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
