import { FlatList, Platform, Pressable, ScrollView, TouchableOpacity, View, ViewStyle, TextStyle } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { ThemedStyle } from '@/theme/types'
import { Search, Plus, ChevronRight, Filter } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { TextField } from '@/components/TextField'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectAllClients, setLoading } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect } from '@react-navigation/native'
import { addDays, isAfter, isBefore, parseISO } from 'date-fns';
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { MotiView } from 'moti'

const ClientsList = ({ route }: any) => {
  const { themed, theme: { colors, spacing, typography } } = useAppTheme();
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectAllClients);

  const filters = ['All Clients', 'Expiring Soon', 'Active', 'Expired', 'Trial', 'Inactive'];
  const [searchText, setSearchText] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>(route?.params?.filter || 'All Clients');

  // Update filter if navigation params change while screen is already mounted
  React.useEffect(() => {
    if (route?.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route?.params?.filter]);

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
          return c.membershipStatus === 'expired' || c.membershipStatus === 'trial_expired';
        case 'Trial':
          return c.membershipStatus === 'trial';
        case 'Inactive':
          return c.membershipStatus === 'cancelled';
        case 'Expiring Soon':
          if (!c.activeMembership?.endDate) return false;
          const endDate = parseISO(c.activeMembership.endDate);
          return (c.membershipStatus === 'active' && isAfter(endDate, now) && isBefore(endDate, sevenDaysFromNow));
        case 'All Clients':
        default:
          return true;
      }
    });
  }, [clients, selectedFilter, searchText]);

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

  const filterChip = (filter: string, index: number) => {
    const isSelected = selectedFilter === filter;
    return (
      <TouchableOpacity
        key={index}
        style={[themed($chip), isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
        onPress={() => setSelectedFilter(filter)}
      >
        <Text style={themed({ color: isSelected ? colors.background : colors.textDim, fontFamily: isSelected ? typography.primary.semiBold : typography.primary.normal })} size="xs">
          {filter}
        </Text>
      </TouchableOpacity>
    );
  };

  const StatusChip = (st: string) => {
    let bg: any = colors.surface;
    let txt: any = colors.textDim;

    if (st === 'active') { bg = colors.successBackground; txt = colors.success; }
    else if (st === 'trial') { bg = colors.primaryBackground; txt = colors.primary; }
    else if (st === 'future') { bg = colors.palette.slate100; txt = colors.palette.slate600; }
    else if (st === 'expired' || st === 'trial_expired') { bg = colors.errorBackground; txt = colors.error; }

    return (
      <View style={[themed($statusChip), { backgroundColor: bg }]}>
        <Text size='xxs' style={themed({ color: txt, fontFamily: typography.primary.bold, textTransform: 'uppercase' })}>{st}</Text>
      </View>
    );
  };

  const RenderItem = ({ item }: any) => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={themed($itemContainer)}
    >
      <Pressable
        style={themed($item)}
        onPress={() => navigate('Client Profile', { data: item })}
      >
        <View style={$itemContent}>
          <ProfileInitialLogo name={item.name} size={44} imageUrl={item.profilePicture} />
          <View style={$itemTextContainer}>
            <Text style={themed($itemName)}>{item.name}</Text>
            <Text style={themed($itemPhone)}>{item.phoneNumber}</Text>
          </View>
        </View>
        <View style={$itemRight}>
          {StatusChip(item.membershipStatus)}
          <ChevronRight size={18} color={colors.borderStrong} style={{ marginLeft: 8 }} />
        </View>
      </Pressable>
    </MotiView>
  );

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      backgroundColor={colors.background}
      contentContainerStyle={[$styles.flex1]}
    >
      <View style={themed($header)}>
        <Text preset="heading" style={themed($headerTitle)}>Clients</Text>
        <Pressable style={themed($addBtn)} onPress={() => navigate('Add Client')}>
          <Plus size={24} color={colors.background} />
        </Pressable>
      </View>

      <View style={themed($searchContainer)}>
        <TextField
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search members..."
          returnKeyType="search"
          LeftAccessory={() => (
            <View style={{ paddingLeft: 12 }}>
              <Search size={20} color={colors.textDim} />
            </View>
          )}
        />
      </View>

      <View style={$filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$filterContent}
        >
          {filters.map((filter, index) => filterChip(filter, index))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item._id || item.phoneNumber}
        renderItem={RenderItem}
        contentContainerStyle={themed($listContent)}
        ListEmptyComponent={
          <View style={$emptyContainer}>
            <Text style={themed({ color: colors.textDim })}>No members found</Text>
          </View>
        }
      />
    </Screen>
  )
}

export default ClientsList

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
})

const $headerTitle: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontFamily: typography.secondary.bold,
  fontSize: 32,
})

const $addBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.primary,
  borderRadius: 16,
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
})

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  marginBottom: spacing.md,
})

const $filterWrapper: ViewStyle = {
  marginBottom: 16,
}

const $filterContent: ViewStyle = {
  paddingHorizontal: 24,
  alignItems: 'center',
}

const $filterIconContainer: ViewStyle = {
  marginRight: 12,
}

const $chip: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  marginRight: spacing.xs,
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xl,
})

const $itemContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $item: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 12,
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
})

const $itemContent: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
}

const $itemTextContainer: ViewStyle = {
  flex: 1,
}

const $itemName: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontFamily: typography.primary.semiBold,
  fontSize: 15,
  color: colors.text,
})

const $itemPhone: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.textDim,
  marginTop: 2,
})

const $itemRight: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
}

const $statusChip: ViewStyle = {
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 8,
}

const $emptyContainer: ViewStyle = {
  alignItems: 'center',
  marginTop: 40,
}