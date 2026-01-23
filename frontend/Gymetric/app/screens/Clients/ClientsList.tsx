import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { ThemedStyle } from '@/theme/types'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '@/theme/context'
import { colors } from '@/theme/colors'
import { TextField } from '@/components/TextField'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectAllClients, setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { spacing } from '@/theme/spacing'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect } from '@react-navigation/native'
import { addDays, isAfter, isBefore, parseISO, } from 'date-fns';
import { getInitials } from '@/utils/Helper'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'

const ClientsList = () => {
  const { themed } = useAppTheme();
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectAllClients);

  const filters = ['All Clients', 'Expiring Soon', 'Active', 'Expired', 'Trial', 'Inactive'];
  const [searchText, setSearchText] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All Clients');

  const filteredClients = useMemo(() => {
    if (!clients?.length) return [];
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7);
    const search = searchText.trim().toLowerCase();
    const searchFiltered = search ? clients.filter((c) => c.name?.toLowerCase().includes(search) || c.phoneNumber?.includes(search)) : clients;
    return searchFiltered.filter((c) => {
      switch (selectedFilter) {
        case 'Active':
          return c.membershipStatus === 'active';
        case 'Expired':
          return c.membershipStatus === 'expired';
        case 'Trial':
          return c.membershipStatus === 'trial';
        case 'Inactive':
          return c.membershipStatus === 'cancelled' || c.membershipStatus === 'trial_expired';
        case 'Expiring Soon':
          if (!c.currentEndDate) return false;
          const endDate = parseISO(c.currentEndDate);
          return (c.membershipStatus === 'active' && isAfter(endDate, now) && isBefore(endDate, sevenDaysFromNow));
        case 'All Clients':
        default:
          return true;
      }
    });

  }, [clients, selectedFilter, searchText]);


  const filterChip = (filter: string, index: number) => (
    <TouchableOpacity key={index} style={[themed($chip), { height: 35, backgroundColor: selectedFilter === filter ? colors.text : colors.palette.neutral100 }]} onPress={() => { setSelectedFilter(filter) }}>
      <Text style={themed({ color: selectedFilter === filter ? colors.background : colors.text })}>{filter}</Text>
    </TouchableOpacity>
  );

  const StatusChip = (st: string) => (
    <View style={themed({ backgroundColor: st === 'active' ? colors.activeBg : st === 'trial' ? colors.palette.accent200 : st === 'future' ? colors.palette.secondary100 : colors.errorBackground, paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: 20 })}>
      <Text size='xs' style={themed({ color: st === 'active' ? colors.activeTxt : st === 'trial' ? colors.tint : st === 'future' ? colors.palette.secondary500 : colors.error, textTransform: 'capitalize' })}>{st}</Text>
    </View>
  );

  const RenderItem = ({ item, index }: any) => (
    <Pressable style={[themed($item), $styles.flexRow]} onPress={() => { navigate('Client Profile', { data: item }) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ProfileInitialLogo name={item.name}/>
        <View>
          <Text weight='medium' size='md'>{item.name}</Text>
          <Text size='xs'>{item.phoneNumber}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {StatusChip(item.membershipStatus)}
        <Ionicons name='chevron-forward' size={15} color={colors.tintInactive} style={{ marginLeft: 10 }} />
      </View>
    </Pressable>
  );


  const getClients = async () => {
    dispatch(setLoading({ loading: true }));
    await api.allClients();
    dispatch(setLoading({ loading: false }));
  };

  useFocusEffect(
    useCallback(() => {
      getClients();
    }, [])
  );

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      contentContainerStyle={[$styles.flex1]}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <View style={[$styles.flexRow, { paddingHorizontal: 15 }]}>
        <Text preset="heading">Clients</Text>
        <Pressable style={themed($addBtn)} onPress={() => { navigate('Add Client') }}>
          <Ionicons name='add' size={25} color={colors.background} />
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ minHeight: 40, maxHeight: 40, marginBottom: 5, marginLeft: 15 }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 5 }}>
        {filters.map((filter: string, index: number) => filterChip(filter, index))}
      </ScrollView>
      <View style={[$styles.flexRow, { paddingBottom: 10, paddingHorizontal: 15 }]}>
        <Text size='xs' style={{ color: colors.textDim }}>Members ({clients?.length})</Text>
      </View>
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
  backgroundColor: colors.palette.neutral100,
  alignItems: 'center',
  paddingStart: 10,
  paddingVertical: 5,
  borderWidth: 0,
  marginHorizontal: 15
})

const $chip: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
  borderRadius: 15,
  paddingHorizontal: 10,
  paddingVertical: 5,
  alignItems: 'center',
  justifyContent: 'center'
})

const $item: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingVertical: 10,
  borderColor: colors.border,
  paddingHorizontal: 15,
  backgroundColor: colors.palette.neutral100,
  margin: 5,
  marginHorizontal: 10,
  borderRadius: 10
})