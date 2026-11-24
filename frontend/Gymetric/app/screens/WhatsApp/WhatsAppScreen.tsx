import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, View, ViewStyle } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Check, CheckCheck, MessageSquarePlus, Settings2 } from 'lucide-react-native'
import { isToday, format } from 'date-fns'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { Segmented } from '@/components/common/Segmented'
import { ClientSearchBar } from '@/components/clients/ClientSearchBar'
import { MessageLog } from '@/screens/Setting/WhatsAppMessages'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { usePermissions } from '@/utils/permissions'
import { refreshChatUnread, useChatUnread } from '@/utils/chatUnread'
import { whatsappTemplateLabel } from '@/utils/whatsappLabels'

export type ChatThread = {
  key: string
  memberId: string | null
  phone: string
  name: string | null
  photo: string | null
  last: { body: string; direction: 'in' | 'out'; status: string; at: string; template: string | null }
  unread: number
  windowOpen: boolean
}

type Tab = 'chats' | 'log'

const timeLabel = (iso: string) => {
  const date = new Date(iso)
  if (isToday(date)) return format(date, 'h:mm a')
  const diffDays = (Date.now() - date.getTime()) / 86_400_000
  return diffDays < 7 ? format(date, 'EEE') : format(date, 'd MMM')
}

const preview = (thread: ChatThread) => {
  if (thread.last.template) return `${whatsappTemplateLabel(thread.last.template)} sent`
  return thread.last.body
}

function ThreadRow({ thread }: { thread: ChatThread }) {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const outgoing = thread.last.direction === 'out'
  const Tick = thread.last.status === 'read' || thread.last.status === 'delivered' ? CheckCheck : Check
  return (
    <Pressable
      style={({ pressed }) => [themed($thread), pressed && { opacity: 0.85 }]}
      onPress={() => navigate('WhatsApp Chat', { memberId: thread.memberId, phone: thread.phone, name: thread.name })}
    >
      <ProfileInitialLogo name={thread.name ?? thread.phone} imageUrl={thread.photo ?? undefined} size={46} sideMargin={false} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text weight={thread.unread ? 'bold' : 'semiBold'} numberOfLines={1} style={{ flex: 1 }} text={thread.name ?? `+91 ${thread.phone}`} />
          <Text size="xxs" style={{ color: thread.unread ? colors.success : colors.textDim }} text={timeLabel(thread.last.at)} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
          {outgoing ? (
            thread.last.status === 'failed'
              ? <Ionicons name="alert-circle" size={14} color={colors.error} />
              : <Tick size={14} color={thread.last.status === 'read' ? colors.primary : colors.textDim} />
          ) : null}
          <Text size="xs" numberOfLines={1} style={{ flex: 1, color: thread.unread ? colors.text : colors.textDim }} text={preview(thread)} />
          {thread.unread ? (
            <View style={themed($unread)}>
              <Text size="xxs" weight="bold" style={{ color: colors.white }} text={String(thread.unread)} />
            </View>
          ) : thread.windowOpen ? (
            <View style={themed($openDot)} />
          ) : null}
        </View>
        {!thread.memberId ? <Text size="xxs" style={{ color: colors.warning, marginTop: 2 }} text="Not a client yet" /> : null}
      </View>
    </Pressable>
  )
}

function Chats() {
  const { theme: { colors, spacing } } = useAppTheme()
  const [threads, setThreads] = useState<ChatThread[] | null>(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    const response = await api.chatThreads(query || undefined)
    if (response.kind === 'ok') setThreads(response.data)
    refreshChatUnread()
  }, [query])

  useFocusEffect(useCallback(() => {
    load()
    const timer = setInterval(load, 20_000)
    return () => clearInterval(timer)
  }, [load]))

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.md }}>
        <ClientSearchBar value={search} onChangeText={setSearch} placeholder="Search name or phone" />
      </View>
      {!threads ? (
        <View style={{ padding: spacing.md, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} width="100%" height={64} borderRadius={14} />)}
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.key}
          renderItem={({ item }) => <ThreadRow thread={item} />}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 56, paddingHorizontal: spacing.lg }}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.textDim} />
              <Text weight="semiBold" style={{ marginTop: 12 }} text={query ? 'No matching chats' : 'No chats yet'} />
              <Text size="sm" style={{ color: colors.textDim, marginTop: 4, textAlign: 'center' }} text={query ? 'Try another name or number.' : 'When clients reply to your WhatsApp messages, the conversation shows up here.'} />
            </View>
          }
        />
      )}
    </View>
  )
}

function NotConnected({ canSetup }: { canSetup: boolean }) {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  return (
    <View style={{ padding: spacing.md }}>
      <View style={themed($connectCard)}>
        <View style={themed($waIcon)}>
          <Ionicons name="logo-whatsapp" size={32} color={colors.white} />
        </View>
        <Text preset="subheading" weight="bold" style={{ textAlign: 'center', marginTop: spacing.md }} text="Connect your WhatsApp Business number" />
        <Text size="sm" style={{ textAlign: 'center', color: colors.textDim, marginTop: spacing.xs }} text="Send welcome, renewal and expiry messages automatically, and reply to clients from here." />
        {canSetup ? (
          <Button title="See how to connect" style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} onPress={() => navigate('WhatsApp Premium')} />
        ) : (
          <Text size="xs" style={{ textAlign: 'center', color: colors.textDim, marginTop: spacing.lg }} text="Ask the gym owner to connect WhatsApp." />
        )}
      </View>
    </View>
  )
}

const WhatsAppScreen = () => {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const can = usePermissions()
  const canChat = can('whatsapp.chat')
  const canSettings = can('whatsapp.settings')
  const unread = useChatUnread()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>(canChat ? 'chats' : 'log')

  useFocusEffect(useCallback(() => {
    api.getSettings().then((response) => {
      if (response.kind === 'ok') setConnected(!!response.data?.hasWhatsappConfigured)
    })
  }, []))

  return (
    <Screen preset="fixed" safeAreaEdges={['top']} contentContainerStyle={{ flex: 1 }}>
      <View style={themed($titleRow)}>
        <Text preset="heading" style={{ flex: 1 }} text="WhatsApp" />
        {connected && canChat ? (
          <Pressable onPress={() => navigate('Search Client', { intent: 'message' })} hitSlop={8} style={themed($iconButton)} accessibilityLabel="Message a client">
            <MessageSquarePlus size={20} color={colors.text} />
          </Pressable>
        ) : null}
        {connected && canSettings ? (
          <Pressable onPress={() => navigate('Notification Settings')} hitSlop={8} style={themed($iconButton)} accessibilityLabel="WhatsApp settings">
            <Settings2 size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {connected === null ? (
        <View style={{ padding: spacing.md, gap: 10 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={64} borderRadius={14} />)}
        </View>
      ) : !connected ? (
        <NotConnected canSetup={canSettings} />
      ) : (
        <>
          {canChat ? (
            <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.xs }}>
              <Segmented<Tab>
                options={[{ value: 'chats', label: 'Chats', badge: unread || undefined }, { value: 'log', label: 'Message log' }]}
                value={tab}
                onChange={setTab}
              />
            </View>
          ) : null}
          {tab === 'chats' && canChat ? <Chats /> : <MessageLog />}
        </>
      )}
    </Screen>
  )
}

export default WhatsAppScreen

const $titleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
})

const $iconButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
})

const $thread: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $unread: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  paddingHorizontal: 5,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.success,
})

const $openDot: ThemedStyle<ViewStyle> = ({ colors }) => ({ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success })

const $connectCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: 'center',
  padding: spacing.lg,
  borderRadius: 20,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
})

const $waIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 64,
  height: 64,
  borderRadius: 32,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.success,
})
