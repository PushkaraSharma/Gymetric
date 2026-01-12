import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { ThemedStyle } from '@/theme/types'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '@/theme/context'
import { colors } from '@/theme/colors'
import { TextField } from '@/components/TextField'
import { DemoDivider } from '../DemoShowroomScreen/DemoDivider'
import { ListItem } from '@/components/ListItem'
import { useAppDispatch } from '@/redux/Hooks'
import { setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/api'
import { spacing } from '@/theme/spacing'

const ClientsList = () => {
  const { themed } = useAppTheme();
  const dispatch = useAppDispatch();

  const filters = ['All Clients', 'Expiring Soon', 'Active', 'Expired', 'Trial', 'Inactive'];
  const [searchText, setSearchText] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All Clients');
  const [clients, setClients] = useState<{ [key: string]: any }[]>([]);
  const filteredClients = clients;


  const filterChip = (filter: string, index: number) => (
    <TouchableOpacity key={index} style={[themed($chip), { backgroundColor: selectedFilter === filter ? colors.text : colors.palette.neutral250 }]} onPress={() => { setSelectedFilter(filter) }}>
      <Text style={themed({ color: selectedFilter === filter ? colors.background : colors.text })}>{filter}</Text>
    </TouchableOpacity>
  );

  const StatusChip = (st: string) => (
    <View style={themed({ backgroundColor: st === 'active' ? colors.activeBg : st === 'trial' ? colors.palette.accent200 : colors.errorBackground, paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: 20 })}>
      <Text size='xs' style={themed({ color: st === 'active' ? colors.activeTxt : st === 'trial' ? colors.tint : colors.error })}>{st}</Text>
    </View>
  );

  const RenderItem = ({ item, index }: any) => (
    <Pressable style={[themed($item), $styles.flexRow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={themed({ backgroundColor: colors.palette.accent200, padding: 10, borderRadius: 25, marginRight: 15 })}>
          <Text style={themed({ color: colors.tint })} size='md'>AS</Text>
        </View>
        <View>
          <Text weight='semiBold' size='md'>{item.name}</Text>
          <Text weight='light'>{item.phoneNumber}</Text>
        </View>
      </View>
      {StatusChip(item.membershipStatus)}
    </Pressable>
  );


  const getClients = async () => {
    dispatch(setLoading({ loading: true }));
    const response = await api.allClients();
    if (response.kind === 'ok') {
      setClients(response.data);
    } else {
      setClients([]);
    }
    dispatch(setLoading({ loading: false }));
  };

  useEffect(() => {
    getClients();
  }, []);

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      contentContainerStyle={[$styles.flex1, { paddingHorizontal: 15 }]}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <View style={$styles.flexRow}>
        <Text preset="heading">Client Directory</Text>
        <Pressable style={themed($addBtn)}>
          <Ionicons name='add' size={30} color={colors.background} />
        </Pressable>
      </View>
      <TextField
        value={searchText}
        onChangeText={setSearchText}
        inputWrapperStyle={themed($textField)}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Seach by name or phone number"
        LeftAccessory={() => <Ionicons name='search' size={22} color={colors.tint} />}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 5 }} contentContainerStyle={{ alignItems: 'center' }}>
        {filters.map((filter: string, index: number) => filterChip(filter, index))}
      </ScrollView>
      <View style={themed($divider)} />
      <View style={[$styles.flexRow, { paddingVertical: 5 }]}>
        <Text size='xs'>MEMBERS (1)</Text>
        <Text style={themed({ color: colors.tint })}>Sort by Name</Text>
      </View>
      <View style={themed($divider)} />
      <FlatList
        data={filteredClients}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={RenderItem}
      />
    </Screen>
  )
}

export default ClientsList

const $addBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  borderRadius: 30,
  padding: 5,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.xs,
  borderRadius: 10,
  backgroundColor: colors.palette.neutral250,
  alignItems: 'center',
  paddingStart: 10,
  paddingVertical: 0
})

const $chip: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
  borderRadius: 15,
  paddingHorizontal: 10,
  paddingVertical: 5,
  alignItems: 'center',
  justifyContent: 'center'
})

const $divider: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  height: StyleSheet.hairlineWidth,
  backgroundColor: colors.border,
  marginVertical: 5
})

const $item: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border
})