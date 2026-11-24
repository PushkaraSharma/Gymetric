import React, { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, TextInput, View, ViewStyle, TextStyle } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import Toast from 'react-native-toast-message'
import { Ionicons } from '@expo/vector-icons'
import { Check, CheckCheck, Clock, FileText, SendHorizontal } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { refreshChatUnread } from '@/utils/chatUnread'
import { whatsappTemplateLabel } from '@/utils/whatsappLabels'

type Message = {
  _id: string
  direction: 'in' | 'out'
  body: string
  template: string | null
  status: string
  errorMessage: string | null
  at: string
  sentBy: string | null
}

type Thread = {
  memberId: string | null
  phone: string
  name: string | null
  connected: boolean
  windowEndsAt: string | null
  hasMore?: boolean
  templates: { key: string; label: string; preview: string }[]
  messages: Message[]
}

type Params = { memberId?: string | null; phone?: string; name?: string | null }

const dayLabel = (date: Date) => (isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'd MMM yyyy'))

// Automatic sends are stored as "template: param, param"; show only the params for readability.
const messageText = (m: Message) => (m.template && m.body.startsWith(`${m.template}:`) ? m.body.slice(m.template.length + 1).trim() : m.body)

function Bubble({ message, showDay }: { message: Message; showDay: boolean }) {
  const { themed, theme: { colors }, isDark } = useAppTheme()
  const mine = message.direction === 'out'
  const at = new Date(message.at)
  const Tick = message.status === 'read' || message.status === 'delivered' ? CheckCheck : message.status === 'queued' ? Clock : Check
  return (
    <View>
      {showDay ? (
        <View style={themed($dayPill)}>
          <Text size="xxs" weight="medium" style={{ color: colors.textDim }} text={dayLabel(at)} />
        </View>
      ) : null}
      <View style={[themed($bubble), mine ? $mine : $theirs, { backgroundColor: mine ? (isDark ? WA.darkMine : WA.lightMine) : (isDark ? WA.darkTheirs : colors.surface) }]}>
        {message.template ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <FileText size={12} color={colors.textDim} />
            <Text size="xxs" weight="semiBold" style={{ color: colors.textDim }} text={whatsappTemplateLabel(message.template)} />
          </View>
        ) : null}
        <Text size="sm" text={messageText(message)} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
          {mine && message.sentBy ? <Text size="xxs" style={{ color: colors.textDim }} text={message.sentBy} /> : null}
          <Text size="xxs" style={{ color: colors.textDim }} text={format(at, 'h:mm a')} />
          {mine ? (
            message.status === 'failed'
              ? <Ionicons name="alert-circle" size={13} color={colors.error} />
              : <Tick size={13} color={message.status === 'read' ? WA.readTick : colors.textDim} />
          ) : null}
        </View>
        {message.status === 'failed' && message.errorMessage ? (
          <Text size="xxs" style={{ color: colors.error, marginTop: 2 }} text={message.errorMessage} />
        ) : null}
      </View>
    </View>
  )
}

const ChatThreadScreen = ({ route }: any) => {
  const params = route.params as Params
  const { themed, theme: { colors, spacing }, isDark } = useAppTheme()
  const [thread, setThread] = useState<Thread | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  // Messages from older pages, kept when the newest page refreshes every 15 seconds.
  const [older, setOlder] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const olderLoaded = useRef(false)

  const load = useCallback(async () => {
    const response = await api.chatThread({ memberId: params.memberId, phone: params.phone })
    if (response.kind === 'ok') {
      setThread(response.data)
      // Until an older page is fetched, the newest page decides whether there is more to load.
      if (!olderLoaded.current) setHasMore(!!response.data?.hasMore)
      refreshChatUnread()
    }
  }, [params.memberId, params.phone])

  const loadOlder = async () => {
    const oldest = older[0] ?? thread?.messages[0]
    if (!hasMore || loadingOlder || !oldest) return
    setLoadingOlder(true)
    const response = await api.chatThread({ memberId: params.memberId, phone: params.phone }, oldest.at)
    setLoadingOlder(false)
    if (response.kind === 'ok') {
      olderLoaded.current = true
      setOlder((current) => [...(response.data?.messages ?? []), ...current])
      setHasMore(!!response.data?.hasMore)
    }
  }

  useFocusEffect(useCallback(() => {
    load()
    const timer = setInterval(load, 15_000)
    return () => clearInterval(timer)
  }, [load]))

  const windowOpen = !!thread?.windowEndsAt && new Date(thread.windowEndsAt).getTime() > Date.now()
  const hoursLeft = windowOpen ? Math.max(1, Math.round((new Date(thread!.windowEndsAt!).getTime() - Date.now()) / 3_600_000)) : 0

  const send = async () => {
    const body = text.trim()
    if (!body || !thread) return
    setSending(true)
    const response = await api.chatSend({ memberId: thread.memberId, phone: thread.phone, text: body })
    setSending(false)
    if (response.kind === 'ok') {
      setText('')
      load()
    }
  }

  const sendTemplate = (template: Thread['templates'][number]) => {
    if (!thread?.memberId) return
    Alert.alert(`Send "${template.label}"?`, template.preview, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          const response = await api.chatSendTemplate({ memberId: thread.memberId!, template: template.key })
          if (response.kind === 'ok') {
            Toast.show({ type: 'success', text1: `${template.label} sent` })
            load()
          }
        },
      },
    ])
  }

  const title = thread?.name ?? params.name ?? `+91 ${params.phone ?? ''}`
  const latest = thread?.messages ?? []
  const latestIds = new Set(latest.map((m) => m._id))
  const messages = [...older.filter((m) => !latestIds.has(m._id)), ...latest]
  const reversed = messages.slice().reverse()
  const wallpaper = isDark ? WA.darkWallpaper : WA.lightWallpaper

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['bottom']}
      contentContainerStyle={{ flex: 1 }}
      {...(Platform.OS === 'android' ? { KeyboardAvoidingViewProps: { behavior: 'height' } } : {})}
    >
      <Header
        title={title}
        leftIcon="caretLeft"
        onLeftPress={goBack}
        backgroundColor={colors.surface}
        safeAreaTop
        RightActionComponent={thread?.memberId ? (
          <Pressable onPress={() => navigate('Client Profile', { data: { _id: thread.memberId } })} style={{ paddingHorizontal: spacing.md }} hitSlop={8}>
            <Text size="xs" weight="semiBold" style={{ color: colors.primary }} text="Profile" />
          </Pressable>
        ) : undefined}
      />

      {!thread ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <FlatList
            inverted
            data={reversed}
            keyExtractor={(m) => m._id}
            style={{ backgroundColor: wallpaper }}
            contentContainerStyle={{ padding: spacing.md }}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingOlder ? <ActivityIndicator color={colors.textDim} style={{ marginVertical: spacing.sm }} /> : null}
            renderItem={({ item, index }) => {
              const older = reversed[index + 1]
              return <Bubble message={item} showDay={!older || !isSameDay(new Date(older.at), new Date(item.at))} />
            }}
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', paddingVertical: spacing.xl }}>
                <Text size="sm" style={{ color: colors.textDim, textAlign: 'center' }} text="No messages with this client yet." />
              </View>
            }
          />

          {!thread.connected ? (
            <View style={themed($notice)}>
              <Text size="xs" style={{ color: colors.textDim, textAlign: 'center' }} text="WhatsApp is not connected for this gym." />
            </View>
          ) : windowOpen ? (
            <View style={themed($composerWrap)}>
              <Text size="xxs" style={{ color: colors.textDim, marginBottom: 4, marginLeft: 4 }} text={`You can reply for ${hoursLeft} more hour${hoursLeft === 1 ? '' : 's'}`} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Type a message"
                  placeholderTextColor={colors.textDim}
                  multiline
                  maxLength={4096}
                  style={themed($input)}
                />
                <Pressable
                  onPress={send}
                  disabled={!text.trim() || sending}
                  style={[themed($sendButton), (!text.trim() || sending) && { opacity: 0.5 }]}
                  accessibilityLabel="Send message"
                >
                  {sending ? <ActivityIndicator color={colors.white} size="small" /> : <SendHorizontal size={20} color={colors.white} />}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={themed($notice)}>
              <Text size="xs" style={{ color: colors.textDim, textAlign: 'center' }} text={thread.memberId
                ? "This client hasn't messaged you in the last 24 hours, so WhatsApp only allows approved templates."
                : 'This number is not a client. You can reply after they message you again.'} />
              {thread.templates.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
                  {thread.templates.map((t) => (
                    <Pressable key={t.key} onPress={() => sendTemplate(t)} style={themed($templateChip)}>
                      <FileText size={14} color={colors.primary} />
                      <Text size="xs" weight="semiBold" style={{ color: colors.primary }} text={`Send ${t.label.toLowerCase()}`} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </>
      )}
    </Screen>
  )
}

export default ChatThreadScreen

const $dayPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignSelf: 'center',
  paddingHorizontal: 10,
  paddingVertical: 3,
  borderRadius: 10,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  marginVertical: spacing.sm,
})

const $bubble: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  maxWidth: '82%',
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 14,
  marginBottom: 6,
})

// WhatsApp's own chat colours (CoreWave's wa-* tokens), so the thread reads like WhatsApp.
const WA = {
  lightWallpaper: '#EFEAE2',
  darkWallpaper: '#0B141A',
  lightMine: '#D9FDD3',
  darkMine: '#005C4B',
  darkTheirs: '#202C33',
  readTick: '#53BDEB',
}

const $mine: ViewStyle = {
  alignSelf: 'flex-end',
  borderTopRightRadius: 4,
  shadowColor: '#0B141A',
  shadowOpacity: 0.08,
  shadowRadius: 1,
  shadowOffset: { width: 0, height: 1 },
}

const $theirs: ViewStyle = {
  alignSelf: 'flex-start',
  borderTopLeftRadius: 4,
  shadowColor: '#0B141A',
  shadowOpacity: 0.08,
  shadowRadius: 1,
  shadowOffset: { width: 0, height: 1 },
}

const $notice: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.surface,
})

const $composerWrap: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.surface,
})

const $input: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  maxHeight: 120,
  minHeight: 42,
  paddingHorizontal: spacing.sm,
  paddingTop: 10,
  paddingBottom: 10,
  borderRadius: 21,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  fontSize: 15,
})

const $sendButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.success,
})

const $templateChip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.primary,
  backgroundColor: colors.primaryBackground,
})
