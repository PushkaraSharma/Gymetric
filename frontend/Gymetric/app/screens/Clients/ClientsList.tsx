import { FlatList, Pressable, View, ViewStyle, TextStyle, RefreshControl } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '@/components/Text'
import { ThemedStyle } from '@/theme/types'
import { Plus, Users } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { useAppSelector } from '@/redux/Hooks'
import { selectAllClients } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { addDays, isAfter, isBefore, isSameDay, parseISO } from 'date-fns'
import { Skeleton } from '@/components/Skeleton'
import { ClientSearchBar } from '@/components/clients/ClientSearchBar'
import { ClientFilterChips } from '@/components/clients/ClientFilterChips'
import { ClientListCard } from '@/components/clients/ClientListCard'
import { Button } from '@/components/Button'

const FILTER_IDS = ['All Clients', 'Active', 'Expiring Today', 'Expiring Soon', 'Has Balance', 'Expired', 'Trial', 'Paused'] as const

const isExpiringToday = (c: any, now: Date) => {
  if (c.membershipStatus !== 'active' || !c.activeMembership?.endDate) return false
  return isSameDay(parseISO(c.activeMembership.endDate), now)
}

const isExpiringSoon = (c: any, now: Date, sevenDays: Date) => {
  if (c.membershipStatus !== 'active' || !c.activeMembership?.endDate) return false
  const end = parseISO(c.activeMembership.endDate)
  return isAfter(end, now) && isBefore(end, sevenDays)
}

const ClientsList = ({ route }: any) => {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const navigation = useNavigation<any>()
  const clients = useAppSelector(selectAllClients)

  const [searchText, setSearchText] = useState('')
  const selectedFilter = route?.params?.filter ?? 'All Clients'
  const [isLoading, setIsLoading] = useState(!clients?.length)
  const [refreshing, setRefreshing] = useState(false)

  const handleSelectFilter = useCallback((id: string) => {
    navigation.setParams({ filter: id })
  }, [navigation])

  const getClients = useCallback(async (isRefresh = false) => {
    // Stale-while-revalidate: only show skeletons when we have nothing to display
    if (isRefresh) setRefreshing(true)
    else if (!clients?.length) setIsLoading(true)

    try {
      await api.allClients()
    } finally {
      setRefreshing(false)
      setIsLoading(false)
    }
  }, [clients?.length])

  // Clear loading as soon as Redux has data (e.g. from warmSession) even if a fetch is in flight
  React.useEffect(() => {
    if (clients?.length) setIsLoading(false)
  }, [clients?.length])

  useFocusEffect(useCallback(() => {
    getClients(false)
  }, [getClients]))

  const filterCounts = useMemo(() => {
    if (!clients?.length) return {}
    const now = new Date()
    const sevenDays = addDays(now, 7)
    const counts: Record<string, number> = { 'All Clients': clients.length }
    clients.forEach((c: any) => {
      if (c.membershipStatus === 'active') counts['Active'] = (counts['Active'] || 0) + 1
      if (c.membershipStatus === 'expired' || c.membershipStatus === 'trial_expired') counts['Expired'] = (counts['Expired'] || 0) + 1
      if (c.membershipStatus === 'trial') counts['Trial'] = (counts['Trial'] || 0) + 1
      if ((c.balance || 0) > 0) counts['Has Balance'] = (counts['Has Balance'] || 0) + 1
      if (c.membershipStatus === 'paused') counts['Paused'] = (counts['Paused'] || 0) + 1
      if (isExpiringToday(c, now)) counts['Expiring Today'] = (counts['Expiring Today'] || 0) + 1
      if (isExpiringSoon(c, now, sevenDays)) counts['Expiring Soon'] = (counts['Expiring Soon'] || 0) + 1
    })
    return counts
  }, [clients])

  const filters = useMemo(() =>
    FILTER_IDS.map(id => ({ id, label: id, count: filterCounts[id] })),
    [filterCounts]
  )

  const filteredClients = useMemo(() => {
    if (!clients?.length) return []
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7)
    const search = searchText.trim().toLowerCase()
    const searchFiltered = search
      ? clients.filter((c: any) => c.name?.toLowerCase().includes(search) || c.phoneNumber?.includes(search))
      : clients

    return searchFiltered.filter((c: any) => {
      switch (selectedFilter) {
        case 'Active': return c.membershipStatus === 'active'
        case 'Expired': return c.membershipStatus === 'expired' || c.membershipStatus === 'trial_expired'
        case 'Trial': return c.membershipStatus === 'trial'
        case 'Has Balance': return (c.balance || 0) > 0
        case 'Paused': return c.membershipStatus === 'paused'
        case 'Expiring Today': return isExpiringToday(c, now)
        case 'Expiring Soon': return isExpiringSoon(c, now, sevenDaysFromNow)
        default: return true
      }
    })
  }, [clients, selectedFilter, searchText])

  const activeCount = filterCounts['Active'] || 0
  const balanceCount = filterCounts['Has Balance'] || 0

  return (
    <SafeAreaView style={themed($container)} edges={['top']}>
      <View style={themed($header)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={themed($pageTitle)}>Members</Text>
          <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>
            {clients?.length || 0} total · {activeCount} active{balanceCount > 0 ? ` · ${balanceCount} with dues` : ''}
          </Text>
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
                  {searchText ? 'Try a different search term' : selectedFilter !== 'All Clients' ? 'No members match this filter' : 'Add your first gym member to get started'}
                </Text>
                {!searchText && selectedFilter === 'All Clients' && (
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
  lineHeight: 40
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
