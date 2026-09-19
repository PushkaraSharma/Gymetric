import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Pressable, RefreshControl, View, ViewStyle } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ClientSearchBar } from '@/components/clients/ClientSearchBar'
import { ClientFilterChips } from '@/components/clients/ClientFilterChips'
import { Skeleton } from '@/components/Skeleton'
import { spacing } from '@/theme/spacing'
import { ThemedStyle } from '@/theme/types'
import { formatDate } from 'date-fns'
import { MessageCircle } from 'lucide-react-native'
import { WHATSAPP_STATUS_CHIPS, WHATSAPP_TEMPLATE_CHIPS, whatsappStatusLabel, whatsappTemplateLabel } from '@/utils/whatsappLabels'

export const WhatsAppMessages = () => {
  const { themed, theme: { colors } } = useAppTheme()
  const [summary, setSummary] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [template, setTemplate] = useState('all')
  const [status, setStatus] = useState('all')
  const [initialLoading, setInitialLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const isFirstLoad = useRef(true)
  const requestId = useRef(0)

  const week = summary?.last7Days
  const total = (week?.queued || 0) + (week?.sent || 0) + (week?.delivered || 0) + (week?.read || 0)
  const delivered = (week?.delivered || 0) + (week?.read || 0)
  const hasFilters = template !== 'all' || status !== 'all' || !!debouncedSearch

  const loadSummary = useCallback(async () => {
    const res = await api.getWhatsappSummary()
    if (res.kind === 'ok') setSummary(res.data)
  }, [])

  const loadLogs = useCallback(async (nextPage = 1, replace = true) => {
    const reqId = ++requestId.current
    const res = await api.getWhatsappLogs({
      page: nextPage,
      limit: 30,
      search: debouncedSearch || undefined,
      template: template === 'all' ? undefined : template,
      status: status === 'all' ? undefined : status,
    })
    // A newer request started while this one was in flight, so drop the stale result
    if (reqId !== requestId.current) return
    if (res.kind === 'ok') {
      const data = res.data as any
      setItems((prev) => replace ? (data.items || []) : [...prev, ...(data.items || [])])
      setHasMore(!!data.hasMore)
      setPage(nextPage)
    }
  }, [debouncedSearch, template, status])

  const statusColor = (st: string) => {
    switch (st) {
      case 'delivered':
      case 'read': return { bg: colors.successBackground, text: colors.success }
      case 'failed': return { bg: colors.errorBackground, text: colors.error }
      case 'skipped': return { bg: colors.surface, text: colors.textDim }
      default: return { bg: colors.primaryBackground, text: colors.primary }
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const run = async () => {
      if (!isFirstLoad.current) setFiltering(true)
      await loadLogs(1, true)
      isFirstLoad.current = false
      setInitialLoading(false)
      setFiltering(false)
    }
    run()
  }, [loadLogs])

  return (
    <Screen preset="fixed" contentContainerStyle={{ flex: 1 }} safeAreaEdges={['bottom']}>
      <Header title="WhatsApp Messages" showBack onBack={goBack} safeAreaTop backgroundColor={colors.background} />

      <View style={{ paddingHorizontal: spacing.md }}>
        {summary ? (
          <View style={themed($statsCard)}>
            <Text size="xxs" weight="semiBold" style={{ color: colors.textDim, letterSpacing: 1 }}>LAST 7 DAYS</Text>
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text weight="bold" size="lg">{total}</Text>
                <Text size="xxs" style={{ color: colors.textDim }}>Total</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="bold" size="lg">{delivered}</Text>
                <Text size="xxs" style={{ color: colors.textDim }}>Delivered</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="bold" size="lg">{week?.failed || 0}</Text>
                <Text size="xxs" style={{ color: colors.textDim }}>Failed</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="bold" size="lg">{week?.skipped || 0}</Text>
                <Text size="xxs" style={{ color: colors.textDim }}>Skipped</Text>
              </View>
            </View>
            <Text size="xs" style={{ color: colors.textDim, marginTop: spacing.sm }}>
              {week?.deliveryRate ?? 0}% delivery rate
            </Text>
          </View>
        ) : (
          <Skeleton width="100%" height={110} borderRadius={16} style={{ marginTop: spacing.sm, marginBottom: spacing.md }} />
        )}

        <ClientSearchBar value={search} onChangeText={setSearch} placeholder="Search member or phone" />
        <View style={{ marginBottom: spacing.xs }}>
          <ClientFilterChips filters={WHATSAPP_TEMPLATE_CHIPS} selected={template} onSelect={setTemplate} />
        </View>
        <View style={{ marginBottom: spacing.sm }}>
          <ClientFilterChips filters={WHATSAPP_STATUS_CHIPS} selected={status} onSelect={setStatus} />
        </View>
      </View>

      {initialLoading ? (
        <View style={{ paddingHorizontal: spacing.md }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={72} borderRadius={16} style={{ marginBottom: 10 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          style={{ opacity: filtering ? 0.5 : 1 }}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => {
            if (hasMore && !loadingMore && !filtering) {
              setLoadingMore(true)
              loadLogs(page + 1, false).finally(() => setLoadingMore(false))
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <MessageCircle size={32} color={colors.textDim} />
              <Text weight="semiBold" style={{ marginTop: 12 }}>
                {hasFilters ? 'No matching messages' : 'No messages yet'}
              </Text>
              <Text size="sm" style={{ color: colors.textDim, marginTop: 4, textAlign: 'center' }}>
                {hasFilters
                  ? 'Try a different status, template, or search.'
                  : 'Automated WhatsApp sends will show up here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = statusColor(item.status)
            return (
              <Pressable
                style={themed($row)}
                onPress={() => item.client?._id && navigate('Client Profile', { data: { _id: item.client._id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text weight="semiBold" size="sm" numberOfLines={1}>{item.client?.name || 'Unknown member'}</Text>
                  <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>
                    {whatsappTemplateLabel(item.template)} · {item.sentAt ? formatDate(item.sentAt, 'dd MMM · hh:mm a') : ''}
                  </Text>
                  {item.status === 'failed' && item.errorMessage ? (
                    <Text size="xxs" style={{ color: colors.error, marginTop: 2 }} numberOfLines={2}>{item.errorMessage}</Text>
                  ) : null}
                </View>
                <View style={[themed($badge), { backgroundColor: st.bg }]}>
                  <Text size="xxs" weight="semiBold" style={{ color: st.text }}>{whatsappStatusLabel(item.status)}</Text>
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </Screen>
  )
}

export default WhatsAppMessages

const $statsCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  marginBottom: spacing.md,
  marginTop: spacing.sm,
})

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.surface,
  borderRadius: 16,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  gap: 10,
})

const $badge: ThemedStyle<ViewStyle> = () => ({
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
})
