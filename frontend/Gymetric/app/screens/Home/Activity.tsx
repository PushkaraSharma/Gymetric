import React, { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Skeleton } from '@/components/Skeleton'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ActivityCard, ActivityItem } from '@/components/dashboard/ActivityFeed'
import { PeriodPicker } from '@/components/dashboard/PeriodSheet'
import { ACTIVITY_PERIODS, PeriodId, periodBounds } from '@/utils/periodRange'

const Activity = () => {
  const { theme: { colors, spacing } } = useAppTheme()
  const requestId = useRef(0)
  const [periodId, setPeriodId] = useState<PeriodId>('last_7_days')
  const [customFrom, setCustomFrom] = useState<Date>()
  const [customTo, setCustomTo] = useState<Date>()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const bounds = useMemo(() => periodBounds(periodId, customFrom, customTo), [periodId, customFrom, customTo])

  const load = useCallback(async (nextPage = 1, replace = true) => {
    const reqId = ++requestId.current
    const res = await api.dashboardActivities({ from: bounds.from, to: bounds.to, page: nextPage, limit: 20 })
    if (reqId !== requestId.current) return
    if (res.kind === 'ok') {
      const data = res.data as { items?: ActivityItem[]; hasMore?: boolean }
      setItems((prev) => replace ? (data.items || []) : [...prev, ...(data.items || [])])
      setHasMore(!!data.hasMore)
      setPage(nextPage)
    }
  }, [bounds.from, bounds.to])

  React.useEffect(() => {
    setInitialLoading(true)
    load(1, true).finally(() => setInitialLoading(false))
  }, [load])

  return (
    <Screen preset="fixed" contentContainerStyle={{ flex: 1 }} safeAreaEdges={['bottom']}>
      <Header
        title="Activity"
        showBack
        onBack={goBack}
        safeAreaTop
        backgroundColor={colors.background}
      />
      <View style={{ alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <PeriodPicker
          options={ACTIVITY_PERIODS}
          selectedId={periodId}
          fromDate={bounds.fromDate}
          toDate={bounds.toDate}
          onSelect={setPeriodId}
          onCustomRange={(from, to) => { setCustomFrom(from); setCustomTo(to) }}
        />
      </View>
      {initialLoading ? (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40, paddingTop: spacing.sm }}
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              setLoadingMore(true)
              load(page + 1, false).finally(() => setLoadingMore(false))
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <Text weight="semiBold">No activity in this period</Text>
            </View>
          }
          renderItem={({ item }) => <ActivityCard item={item} />}
        />
      )}
    </Screen>
  )
}

export default Activity
