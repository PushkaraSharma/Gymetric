import { ScrollView, Pressable, RefreshControl, View, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppTheme } from '@/theme/context'
import { Users, Activity as ActivityIconLucide, Clock, UserPlus, UserX, Wallet, IndianRupee, RefreshCw } from 'lucide-react-native'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectDashboardSummary, selectGymInfo, setDashboardSummary } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { MainTabParamList } from '@/navigators/navigationTypes'
import { Skeleton } from '@/components/Skeleton'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { RevenueCard } from '@/components/dashboard/RevenueCard'
import { StatGrid, StatItem } from '@/components/dashboard/StatGrid'
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart'
import { TopSellingPlanCard } from '@/components/dashboard/TopSellingPlanCard'
import { ActionAlertCard } from '@/components/dashboard/ActionAlertCard'
import { GetStartedCard } from '@/components/dashboard/GetStartedCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { WhatsAppBanner } from '@/components/dashboard/WhatsAppBanner'
import { WhatsAppWidget } from '@/components/dashboard/WhatsAppWidget'
import { setGymStats, setEnrichedUserProperties } from '@/services/analyticsService'
import { OTA_VERSION } from '@/utils/Constants'
import Constants from 'expo-constants'
import { WhatsNewModal } from '@/components/WhatsNewModal'
import { load, save } from '@/utils/LocalStorage'
import { useFeature, usePermissions, useViewer } from '@/utils/permissions'
import { QuickActionFab, type QuickAction } from '@/components/dashboard/QuickActionFab'
import { UpsellCard } from '@/components/premium/UpsellCard'

let hasShownBannerSession = false

export interface DashboardSummary {
  totalClients: number
  activeMembers: { value: number; trend: number | null }
  expiredMembers: number
  recentlyExpiredMembers?: number
  expiringIn7Days: number
  expiringToday?: number
  retentionRate: number
  avgRevenuePerMember: number
  revenueTrend: { label: string; amount: number }[]
  revenueThisMonth: { value: number; trend: number | null }
  newlyJoinedThisMonth: { value: number; trend: number | null }
  todayCollection?: number
  totalOutstanding?: number
  clientsWithBalance?: number
  paymentMethodsToday?: { method: string; amount: number; count: number }[]
  topBalanceClients?: { _id: string; name: string; balance: number }[]
  activities: any[]
  topSellingPlansLast6Months?: {
    planId: string
    planName: string
    count: number
    sharePercent: number
    revenue?: number
    avgSaleAmount?: number
  }[]
  totalPlanSalesLast6Months?: number
  totalPlanRevenueLast6Months?: number
  // The viewer's own collections; sent to everyone, shown to those without revenue access.
  myCollections?: { today: number; todayCount: number; thisMonth: number }
}

const Home = () => {
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()
  const { theme, isDark } = useAppTheme()
  const styles = getStyles(theme)
  const dispatch = useAppDispatch()
  const gymInfo = useAppSelector(selectGymInfo)
  const cachedSummary = useAppSelector(selectDashboardSummary) as DashboardSummary | null
  const [summary, setSummary] = useState<DashboardSummary | null>(cachedSummary)
  const [showBanner, setShowBanner] = useState(false)
  const [hasWhatsapp, setHasWhatsapp] = useState(false)
  const planHasWhatsapp = useFeature('whatsapp')
  const viewer = useViewer()
  const can = usePermissions()
  const isOwner = viewer.roleKey === 'owner'
  const canRevenue = can('dashboard.revenue')
  const canClients = can('clients.view')
  const [whatsappSummary, setWhatsappSummary] = useState<any>(null)
  const [hasMembershipPlans, setHasMembershipPlans] = useState(false)
  const [isLoading, setIsLoading] = useState(!cachedSummary)
  const [refreshing, setRefreshing] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const summaryRef = useRef<DashboardSummary | null>(cachedSummary)

  useEffect(() => {
    summaryRef.current = summary ?? cachedSummary
  }, [cachedSummary, summary])

  useEffect(() => {
    const lastSeen = load<number>('@last_seen_ota_version')
    if (lastSeen !== OTA_VERSION) {
      setShowWhatsNew(true)
      save('@last_seen_ota_version', OTA_VERSION)
    }
  }, [])

  const handleWhatsNewClose = () => setShowWhatsNew(false)

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else if (!summaryRef.current) setIsLoading(true)

    const [dashboardRes, settingsRes, membershipsRes, waSummaryRes] = await Promise.all([
      api.dashboardAPI(),
      !hasShownBannerSession || isRefresh ? api.getSettings() : Promise.resolve(null),
      api.allMemberships(),
      planHasWhatsapp ? api.getWhatsappSummary() : Promise.resolve(null),
    ])

    if (dashboardRes.kind === 'ok') {
      setSummary(dashboardRes.data as DashboardSummary)
      dispatch(setDashboardSummary({ dashboardSummary: dashboardRes.data as DashboardSummary }))
      setGymStats({
        totalClients: dashboardRes.data?.totalClients ?? 0,
        activeMembers: dashboardRes.data?.activeMembers?.value ?? 0,
        hasWhatsapp: settingsRes?.kind === 'ok' ? !!settingsRes.data?.hasWhatsappConfigured : hasWhatsapp,
      })
    }

    if (membershipsRes.kind === 'ok') {
      setHasMembershipPlans((membershipsRes.data as any[])?.length > 0)
    }

    if (settingsRes?.kind === 'ok') {
      // WhatsApp counts as on only when it is connected and the plan includes it.
      const whatsappConfigured = !!settingsRes.data?.hasWhatsappConfigured && planHasWhatsapp
      setHasWhatsapp(whatsappConfigured)
      // The "Premium Integration" banner is a sales nudge, so only the owner sees it.
      if (!hasShownBannerSession && !whatsappConfigured && isOwner) {
        setShowBanner(true)
      }
      hasShownBannerSession = true
    }

    if (waSummaryRes?.kind === 'ok') {
      setWhatsappSummary(waSummaryRes.data)
    }

    setEnrichedUserProperties({
      appVersion: `${Constants.expoConfig?.version}_${OTA_VERSION}`,
      darkMode: isDark,
      gymId: gymInfo?._id,
    })

    if (isRefresh) setRefreshing(false)
    else setIsLoading(false)
  }, [dispatch, gymInfo?._id, hasWhatsapp, isDark, planHasWhatsapp, isOwner])

  const onRefresh = useCallback(() => { loadData(true) }, [loadData])

  useFocusEffect(useCallback(() => { loadData(false) }, [loadData]))

  const statItems: StatItem[] = useMemo(() => [
    {
      label: 'Active Now',
      value: summary?.activeMembers?.value ?? 0,
      trend: summary?.activeMembers?.trend,
      icon: <ActivityIconLucide size={20} color={theme.colors.success} />,
      color: theme.colors.success,
      filter: 'Active',
    },
    {
      label: 'Expired',
      value: summary?.expiredMembers ?? 0,
      icon: <UserX size={20} color={theme.colors.error} />,
      color: theme.colors.error,
      filter: 'Expired',
    },
    {
      label: 'Expiring Soon',
      value: summary?.expiringIn7Days ?? 0,
      icon: <Clock size={20} color={theme.colors.palette.indigo500} />,
      color: theme.colors.palette.indigo500,
      filter: 'Expiring Soon',
    },
    {
      label: 'New Joinees',
      value: summary?.newlyJoinedThisMonth?.value ?? 0,
      trend: summary?.newlyJoinedThisMonth?.trend,
      icon: <UserPlus size={20} color={theme.colors.primary} />,
      color: theme.colors.primary,
      filter: 'New this month',
    },
  ], [summary, theme.colors])

  const navigateToMembers = (filter: string) => {
    tabNavigation.navigate('Clients', { filter })
  }

  const handleStatPress = (filter: string) => navigateToMembers(filter)

  const quickActions: QuickAction[] = [
    ...(can('clients.create') ? [{ key: 'add', label: 'Add client', icon: UserPlus, onPress: () => navigate('Add Client') }] : []),
    ...(can('clients.renew') ? [{ key: 'renew', label: 'Renew', icon: RefreshCw, onPress: () => navigate('Search Client', { intent: 'renew' }) }] : []),
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} colors={[theme.colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader
          name={viewer.name || gymInfo?.ownerName || 'Admin'}
          photo={viewer.photo}
          onAvatarPress={() => navigate('My Profile')}
          onNotificationsPress={() => setShowWhatsNew(true)}
        />

        <View style={{ paddingHorizontal: theme.spacing.md }}>
          {isLoading ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Skeleton width="100%" height={180} borderRadius={24} style={{ marginBottom: 24 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Skeleton width="48%" height={120} borderRadius={20} />
                <Skeleton width="48%" height={120} borderRadius={20} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                <Skeleton width="48%" height={120} borderRadius={20} />
                <Skeleton width="48%" height={120} borderRadius={20} />
              </View>
              <Skeleton width="100%" height={160} borderRadius={20} style={{ marginBottom: 16 }} />
            </View>
          ) : (
            <>
              {showBanner && <WhatsAppBanner onDismiss={() => setShowBanner(false)} />}

              {isOwner ? (
                <GetStartedCard
                  totalClients={summary?.totalClients ?? 0}
                  hasMembershipPlans={hasMembershipPlans}
                />
              ) : null}

              <View style={{ marginBottom: theme.spacing.md }}>
                {canRevenue ? (
                  <RevenueCard
                    value={summary?.revenueThisMonth?.value ?? 0}
                    trend={summary?.revenueThisMonth?.trend ?? null}
                    retentionRate={summary?.retentionRate}
                    avgRevenuePerMember={summary?.avgRevenuePerMember}
                    todayCollection={summary?.todayCollection}
                    onPress={() => navigate('Revenue')}
                  />
                ) : (
                  <RevenueCard
                    label="MY COLLECTIONS TODAY"
                    value={summary?.myCollections?.today ?? 0}
                    trend={null}
                    footerLabel={null}
                    stats={[
                      { label: 'Payments today', value: String(summary?.myCollections?.todayCount ?? 0) },
                      { label: 'This month', value: `₹${(summary?.myCollections?.thisMonth ?? 0).toLocaleString('en-IN')}` },
                    ]}
                  />
                )}
              </View>

              {canClients && (summary?.expiringIn7Days ?? 0) > 0 && (
                <ActionAlertCard
                  label="EXPIRING SOON"
                  title={String(summary?.expiringIn7Days)}
                  description={`client${summary?.expiringIn7Days === 1 ? "" : "s"} expiring in the next 7 days`}
                  primaryAction="View Clients"
                  secondaryAction={hasWhatsapp ? 'Reminders' : undefined}
                  onPrimaryPress={() => navigateToMembers('Expiring Soon')}
                  onSecondaryPress={hasWhatsapp ? () => navigate('WhatsApp Messages') : undefined}
                  variant="warning"
                />
              )}

              {/* One sales message at a time: the WhatsApp banner wins while it shows. */}
              {(summary?.expiringIn7Days ?? 0) > 0 && !showBanner ? (
                <UpsellCard
                  place="home_expiring"
                  feature="whatsapp"
                  title={`${summary?.expiringIn7Days} membership${summary?.expiringIn7Days === 1 ? '' : 's'} end this week`}
                  body="With Pro, each client gets a WhatsApp reminder before it ends, without anyone typing it."
                />
              ) : null}

              {canClients && (summary?.recentlyExpiredMembers ?? 0) > 0 && (
                <ActionAlertCard
                  label="RECENTLY EXPIRED"
                  title={String(summary?.recentlyExpiredMembers)}
                  description="expired in the last 14 days — still worth a call."
                  primaryAction="View Clients"
                  onPrimaryPress={() => navigateToMembers('Recently Expired')}
                  variant="danger"
                />
              )}

              {canClients && can('clients.collect') && (summary?.totalOutstanding ?? 0) > 0 && (
                <ActionAlertCard
                  label="OUTSTANDING"
                  title={`₹${summary?.totalOutstanding}`}
                  description={`from ${summary?.clientsWithBalance} client(s) with pending dues`}
                  primaryAction="View Balances"
                  onPrimaryPress={() => navigateToMembers('Has Balance')}
                  variant="warning"
                />
              )}

              {canClients && (summary?.expiringToday ?? 0) > 0 && (
                <ActionAlertCard
                  label="EXPIRING TODAY"
                  title={String(summary?.expiringToday)}
                  description="memberships expiring today"
                  primaryAction="View"
                  onPrimaryPress={() => navigateToMembers('Expiring Today')}
                  variant="danger"
                />
              )}

              {canClients ? <StatGrid stats={statItems} onStatPress={handleStatPress} /> : null}

              {canRevenue ? (
                <>
                  <TopSellingPlanCard
                    plans={summary?.topSellingPlansLast6Months ?? []}
                    totalSales={summary?.totalPlanSalesLast6Months ?? 0}
                    totalRevenue={summary?.totalPlanRevenueLast6Months ?? 0}
                  />
                  <RevenueTrendChart trends={summary?.revenueTrend ?? []} />
                </>
              ) : null}

              {hasWhatsapp && (
                <WhatsAppWidget
                  today={whatsappSummary?.today}
                  last7Days={whatsappSummary?.last7Days}
                  onPress={() => navigate('WhatsApp Messages')}
                />
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <Pressable onPress={() => navigate('Activity')}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>View all</Text>
                </Pressable>
              </View>

              <ActivityFeed activities={summary?.activities ?? []} />
            </>
          )}
        </View>
      </ScrollView>

      <QuickActionFab actions={quickActions} />
      <WhatsNewModal visible={showWhatsNew} onClose={handleWhatsNewClose} />
    </SafeAreaView>
  )
}

export default Home

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: theme.typography.bold,
    fontSize: 20,
    color: theme.colors.text,
  },
})
