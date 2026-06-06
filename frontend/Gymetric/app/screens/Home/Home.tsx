import { ScrollView, Pressable, RefreshControl, View, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useMemo, useState } from 'react'
import { useAppTheme } from '@/theme/context'
import { Plus, Users, Activity as ActivityIconLucide, Clock, UserPlus, UserX } from 'lucide-react-native'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import { api } from '@/services/Api'
import { navigate } from '@/navigators/navigationUtilities'
import { useFocusEffect } from '@react-navigation/native'
import { Skeleton } from '@/components/Skeleton'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { RevenueCard } from '@/components/dashboard/RevenueCard'
import { StatGrid, StatItem } from '@/components/dashboard/StatGrid'
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart'
import { ActionAlertCard } from '@/components/dashboard/ActionAlertCard'
import { GetStartedCard } from '@/components/dashboard/GetStartedCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { WhatsAppBanner } from '@/components/dashboard/WhatsAppBanner'
import { setGymStats, setEnrichedUserProperties } from '@/services/analyticsService'
import { OTA_VERSION } from '@/utils/Constants'
import Constants from 'expo-constants'

let hasShownBannerSession = false

export interface DashboardSummary {
  totalClients: number
  activeMembers: { value: number; trend: number | null }
  expiredMembers: number
  expiringIn7Days: number
  retentionRate: number
  avgRevenuePerMember: number
  revenueTrend: { label: string; amount: number }[]
  revenueThisMonth: { value: number; trend: number | null }
  newlyJoinedThisMonth: { value: number; trend: number | null }
  activities: any[]
}

const Home = () => {
  const { theme, isDark } = useAppTheme()
  const styles = getStyles(theme)
  const gymInfo = useAppSelector(selectGymInfo)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [hasWhatsapp, setHasWhatsapp] = useState(false)
  const [hasMembershipPlans, setHasMembershipPlans] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else if (!summary) setIsLoading(true)

    const [dashboardRes, settingsRes, membershipsRes] = await Promise.all([
      api.dashboardAPI(),
      !hasShownBannerSession || isRefresh ? api.getSettings() : Promise.resolve(null),
      api.allMemberships(),
    ])

    if (dashboardRes.kind === 'ok') {
      setSummary(dashboardRes.data as DashboardSummary)
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
      const whatsappConfigured = !!settingsRes.data?.hasWhatsappConfigured
      setHasWhatsapp(whatsappConfigured)
      if (!hasShownBannerSession && !whatsappConfigured) {
        setShowBanner(true)
      }
      hasShownBannerSession = true
    }

    setEnrichedUserProperties({
      appVersion: `${Constants.expoConfig?.version}_${OTA_VERSION}`,
      darkMode: isDark,
      gymId: gymInfo?._id,
    })

    if (isRefresh) setRefreshing(false)
    else setIsLoading(false)
  }

  const onRefresh = useCallback(() => { loadData(true) }, [])

  useFocusEffect(useCallback(() => { loadData(false) }, []))

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
      filter: 'All Clients',
    },
  ], [summary, theme.colors])

  const handleStatPress = (filter: string) => navigate('Clients', { filter })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} colors={[theme.colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader
          ownerName={gymInfo?.ownerName || 'Admin'}
          gymLogo={gymInfo?.logo}
          isDark={isDark}
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

              <GetStartedCard
                totalClients={summary?.totalClients ?? 0}
                hasMembershipPlans={hasMembershipPlans}
              />

              {(summary?.expiringIn7Days ?? 0) > 0 && (
                <ActionAlertCard
                  label="EXPIRING SOON"
                  title={String(summary?.expiringIn7Days)}
                  description={`member${summary?.expiringIn7Days === 1 ? '' : 's'} expiring in the next 7 days`}
                  primaryAction="View Members"
                  secondaryAction={hasWhatsapp ? 'Reminders' : undefined}
                  onPrimaryPress={() => navigate('Clients', { filter: 'Expiring Soon' })}
                  onSecondaryPress={hasWhatsapp ? () => navigate('Notification Settings') : undefined}
                  variant="warning"
                />
              )}

              {(summary?.expiredMembers ?? 0) > 0 && (
                <ActionAlertCard
                  label="EXPIRED MEMBERS"
                  title={String(summary?.expiredMembers)}
                  description="members with expired memberships — win them back"
                  primaryAction="Re-engage"
                  onPrimaryPress={() => navigate('Clients', { filter: 'Expired' })}
                  variant="danger"
                />
              )}

              <View style={{ marginBottom: theme.spacing.md }}>
                <RevenueCard
                  value={summary?.revenueThisMonth?.value ?? 0}
                  trend={summary?.revenueThisMonth?.trend ?? null}
                  retentionRate={summary?.retentionRate}
                  avgRevenuePerMember={summary?.avgRevenuePerMember}
                  onPress={() => navigate('Revenue')}
                />
              </View>

              <StatGrid stats={statItems} onStatPress={handleStatPress} />

              <RevenueTrendChart trends={summary?.revenueTrend ?? []} />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>

              <ActivityFeed activities={summary?.activities ?? []} />
            </>
          )}
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => navigate('Add Client')}>
        <Plus size={28} color={theme.colors.background} />
      </Pressable>
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
})
