import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, View, ViewStyle } from 'react-native'
import { Fingerprint } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'

type View_ = {
  readerEnabled: boolean
  fingerprint: { status: 'none' | 'pending' | 'enrolled'; pin: number | null; canEnroll: boolean; doorLock: 'balance' | 'membership' | null }
}

type Props = {
  kind: 'member' | 'staff'
  id: string
  canEdit: boolean
  // Bumps when the parent changes something that affects the door (payment, renewal).
  refreshKey?: unknown
  style?: ViewStyle
}

const calls = {
  member: {
    view: api.memberFingerprint,
    start: api.startMemberFingerprint,
    confirm: api.confirmMemberFingerprint,
    cancel: api.cancelMemberFingerprint,
  },
  staff: {
    view: api.staffFingerprint,
    start: api.startStaffFingerprint,
    confirm: api.confirmStaffFingerprint,
    cancel: api.cancelStaffFingerprint,
  },
}

export function FingerprintCard({ kind, id, canEdit, refreshKey, style }: Props) {
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [view, setView] = useState<View_ | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const response = await calls[kind].view(id)
    if (response.kind === 'ok') setView(response.data)
  }, [kind, id])

  useEffect(() => { load() }, [load, refreshKey])

  // While the reader waits for a finger, poll so the card flips to Enrolled on its own.
  useEffect(() => {
    if (view?.fingerprint.status !== 'pending') return
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
  }, [view?.fingerprint.status, load])

  if (!view?.readerEnabled) return null
  const { status, doorLock, canEnroll } = view.fingerprint

  const run = async (action: 'start' | 'confirm' | 'cancel') => {
    setBusy(true)
    const response = await calls[kind][action](id)
    setBusy(false)
    if (response.kind === 'ok') load()
  }

  const title =
    doorLock === 'balance' ? 'Door locked: balance due'
      : doorLock === 'membership' ? 'Door locked: no active plan'
        : status === 'enrolled' ? 'Fingerprint enrolled'
          : status === 'pending' ? 'Waiting for the finger'
            : 'Fingerprint not enrolled'

  const hint =
    doorLock === 'balance' ? 'Clear the balance and the reader opens for them again.'
      : doorLock === 'membership' ? 'Renew the plan to register or restore the fingerprint.'
        : status === 'pending' ? 'Ask them to press the same finger on the reader 3 times, then tap Done.'
          : status === 'enrolled' ? 'They can open the door with their finger.'
            : 'Register once and they can walk in with their finger.'

  const locked = !!doorLock

  return (
    <View style={[themed($card), style]}>
      <View style={[themed($icon), { backgroundColor: locked ? colors.errorBackground : status === 'enrolled' ? colors.successBackground : colors.primaryBackground }]}>
        <Fingerprint size={20} color={locked ? colors.error : status === 'enrolled' ? colors.success : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="semiBold" size="xs" text={title} style={locked ? { color: colors.error } : undefined} />
        <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }} text={hint} />
        {canEdit && canEnroll && (
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : status === 'pending' ? (
              <>
                <Pressable style={[themed($btn), { backgroundColor: colors.primary }]} onPress={() => run('confirm')}>
                  <Text size="xxs" weight="semiBold" style={{ color: colors.white }} text="Done" />
                </Pressable>
                <Pressable style={themed($btn)} onPress={() => run('cancel')}>
                  <Text size="xxs" weight="semiBold" text="Cancel" />
                </Pressable>
              </>
            ) : (
              <Pressable style={[themed($btn), status !== 'enrolled' && { backgroundColor: colors.primary }]} onPress={() => run('start')}>
                <Text
                  size="xxs"
                  weight="semiBold"
                  style={{ color: status === 'enrolled' ? colors.text : colors.white }}
                  text={status === 'enrolled' ? 'Re-enroll' : 'Register fingerprint'}
                />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  gap: spacing.sm,
  padding: spacing.md,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
})

const $icon: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
})

const $btn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: 6,
  paddingHorizontal: spacing.sm,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.border,
})
