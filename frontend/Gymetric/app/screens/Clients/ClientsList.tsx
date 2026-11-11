import { FlatList, Pressable, View, ViewStyle, TextStyle, RefreshControl, TouchableOpacity } from 'react-native'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '@/components/Text'
import { ThemedStyle } from '@/theme/types'
import { ArrowDownUp, Plus, SlidersHorizontal, Users } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { useAppSelector } from '@/redux/Hooks'
import { selectAllClients } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { addDays } from 'date-fns'
import { Skeleton } from '@/components/Skeleton'
import { ClientSearchBar } from '@/components/clients/ClientSearchBar'
import { ClientFilterChips } from '@/components/clients/ClientFilterChips'
import { ClientListCard } from '@/components/clients/ClientListCard'
import { Button } from '@/components/Button'
import {
  STATUS_FILTER_IDS,
  StatusFilterId,
  SortKey,
  GenderFilter,
  computeFilterCounts,
  matchesStatusFilter,
  matchesGenderFilter,
  matchesPlanFilter,
  sortClients,
} from '@/utils/clientFilters'
import { MembersSortSheet, MembersSortSheetRef } from '@/components/clients/MembersSortSheet'
import { MembersFilterSheet, MembersFilterSheetRef } from '@/components/clients/MembersFilterSheet'

const ClientsList = ({ route }: any) => {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const navigation = useNavigation<any>()
  const clients = useAppSelector(selectAllClients)
  const sortSheetRef = useRef<MembersSortSheetRef>(null)
  const filterSheetRef = useRef<MembersFilterSheetRef>(null)

  const [searchText, setSearchText] = useState('')
  const selectedFilter = (route?.params?.filter ?? 'All Clients') as StatusFilterId
  const [sortKey, setSortKey] = useState<SortKey>('name_asc')
  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All')
  const [isLoading, setIsLoading] = useState(!clients?.length)
  const [refreshing, setRefreshing] = useState(false)

  const handleSelectFilter = useCallback((id: string) => {
    navigation.setParams({ filter: id })
  }, [navigation])

  const getClients = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else if (!clients?.length) setIsLoading(true)

    try {
      await api.allClients()
    } finally {
      setRefreshing(false)
      setIsLoading(false)
    }
  }, [clients?.length])

  React.useEffect(() => {
    if (clients?.length) setIsLoading(false)
  }, [clients?.length])

  useFocusEffect(useCallback(() => {
    getClients(false)
  }, [getClients]))

  const filterCounts = useMemo(() => {
    if (!clients?.length) return {}
    return computeFilterCounts(clients)
  }, [clients])

  const filters = useMemo(() =>
    STATUS_FILTER_IDS.map(id => ({ id, label: id, count: filterCounts[id] })),
    [filterCounts]
  )

  const planOptions = useMemo(() => {
    if (!clients?.length) return []
    const names = new Set<string>()
    clients.forEach((c: any) => {
      const plan = c.activeMembership?.planName
      if (plan) names.add(plan)
    })
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [clients])

  const activeFilterCount =
    (genderFilter !== 'All' ? 1 : 0) + (selectedPlans.length > 0 ? 1 : 0)

  const filteredClients = useMemo(() => {
    if (!clients?.length) return []
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7)
    const search = searchText.trim().toLowerCase()
    let list = search
      ? clients.filter((c: any) => c.name?.toLowerCase().includes(search) || c.phoneNumber?.includes(search))
      : clients

    list = list.filter(
      (c: any) =>
        matchesStatusFilter(c, selectedFilter, now, sevenDaysFromNow) &&
        matchesGenderFilter(c, genderFilter) &&
        matchesPlanFilter(c, selectedPlans),
    )

    return sortClients(list, sortKey)
  }, [clients, selectedFilter, searchText, sortKey, genderFilter, selectedPlans])

  const applyFilters = (plans: string[], gender: GenderFilter) => {
    setSelectedPlans(plans)
    setGenderFilter(gender)
  }

  return (
    <SafeAreaView style={themed($container)} edges={['top']}>
      <View style={themed($header)}>
        <View style={$headerRow}>
          <Text style={themed($pageTitle)}>Members</Text>
          <View style={$headerActions}>
            <TouchableOpacity
              onPress={() => sortSheetRef.current?.present()}
              style={themed($iconBtn)}
              hitSlop={8}
              accessibilityLabel="Sort members"
            >
              <ArrowDownUp size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => filterSheetRef.current?.present()}
              style={themed($iconBtn)}
              hitSlop={8}
              accessibilityLabel="Filter members"
            >
              <SlidersHorizontal size={22} color={colors.text} />
              {activeFilterCount > 0 && (
                <View style={[$filterBadge, { backgroundColor: colors.primary }]}>
                  <Text size="xxs" weight="bold" style={{ color: colors.white, fontSize: 10 }}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.md, flex: 1 }}>
        {isLoading && !clients?.length ? (
          <View style={{ flex: 1, marginTop: spacing.md }}>
            <View style={themed($stickyHeader)}>
              <ClientSearchBar value={searchText} onChangeText={setSearchText} />
              <ClientFilterChips filters={filters} selected={selectedFilter} onSelect={handleSelectFilter} />
            </View>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} width="100%" height={80} borderRadius={20} style={{ marginBottom: spacing.sm }} />
            ))}
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={filteredClients}
            keyExtractor={(item) => item._id || item.phoneNumber}
            renderItem={({ item, index }) => (
              <ClientListCard
                client={item}
                index={index}
                onPress={() => navigate('Client Profile', { data: item })}
              />
            )}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            stickyHeaderIndices={[0]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => getClients(true)} tintColor={colors.primary} colors={[colors.primary]} />
            }
            ListHeaderComponent={
              <View style={themed($stickyHeader)}>
                <ClientSearchBar value={searchText} onChangeText={setSearchText} />
                <ClientFilterChips filters={filters} selected={selectedFilter} onSelect={handleSelectFilter} />
              </View>
            }
            ListHeaderComponentStyle={{ backgroundColor: colors.background }}
            ListEmptyComponent={
              <View style={themed($empty)}>
                <View style={[themed($emptyIcon), { backgroundColor: colors.primaryBackground }]}>
                  <Users size={32} color={colors.primary} />
                </View>
                <Text weight="semiBold" size="md">No members found</Text>
                <Text size="sm" style={{ color: colors.textDim, textAlign: 'center', marginTop: 4 }}>
                  {searchText ? 'Try a different search term' : selectedFilter !== 'All Clients' || activeFilterCount > 0 ? 'No members match this filter' : 'Add your first gym member to get started'}
                </Text>
                {!searchText && selectedFilter === 'All Clients' && activeFilterCount === 0 && (
                  <Button title="Add Member" onPress={() => navigate('Add Client')} style={{ marginTop: spacing.lg, minWidth: 160 }} />
                )}
              </View>
            }
          />
        )}
      </View>

      <Pressable style={themed($fab)} onPress={() => navigate('Add Client')}>
        <Plus size={26} color={colors.background} />
      </Pressable>

      <MembersSortSheet ref={sortSheetRef} sortKey={sortKey} onSelect={setSortKey} />
      <MembersFilterSheet
        ref={filterSheetRef}
        planOptions={planOptions}
        selectedPlans={selectedPlans}
        gender={genderFilter}
        onApply={applyFilters}
      />
    </SafeAreaView>
  )
}

export default ClientsList

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.xs,
})

const $headerRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const $headerActions: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
}

const $iconBtn: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
})

const $filterBadge: ViewStyle = {
  position: 'absolute',
  top: 4,
  right: 4,
  width: 16,
  height: 16,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
}

const $stickyHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  zIndex: 2,
})

const $pageTitle: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontWeight: typography.bold,
  fontSize: 32,
  color: colors.text,
  lineHeight: 40,
})

const $fab: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  bottom: 24,
  right: 24,
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
})

const $empty: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: 'center',
  marginTop: 60,
  paddingHorizontal: spacing.xl,
})

const $emptyIcon: ThemedStyle<ViewStyle> = () => ({
  width: 72,
  height: 72,
  borderRadius: 36,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
})
