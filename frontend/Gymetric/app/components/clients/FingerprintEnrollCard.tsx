import React, { useState } from 'react'
import { ActivityIndicator, Pressable, View, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import { Fingerprint } from 'lucide-react-native'
import Toast from 'react-native-toast-message'

type Props = {
  clientId: string
  clientName?: string
  biometricPin?: string
  fingerprintStatus?: string
  onUpdated?: () => void
  compact?: boolean
}

const statusLabel = (s?: string) => {
  switch (s) {
    case 'enrolled': return 'Enrolled'
    case 'pending': return 'Waiting for finger'
    case 'needs_reenroll': return 'Needs re-register'
    default: return 'Not enrolled'
  }
}

export const FingerprintEnrollCard = ({
  clientId,
  clientName,
  biometricPin,
  fingerprintStatus = 'none',
  onUpdated,
  compact,
}: Props) => {
  const { theme: { colors }, themed } = useAppTheme()
  const [loading, setLoading] = useState(false)
  const [pin, setPin] = useState(biometricPin)
  const [status, setStatus] = useState(fingerprintStatus)

  const startEnroll = async () => {
    setLoading(true)
    const res = await api.startFingerprintEnroll(clientId)
    setLoading(false)
    if (res.kind === 'ok') {
      setPin(res.data?.biometricPin || pin)
      setStatus('pending')
      Toast.show({
        type: 'success',
        text1: 'Enrollment started',
        text2: 'Ask the member to place their finger on the entrance device',
      })
      onUpdated?.()
    }
  }

  const confirm = async () => {
    setLoading(true)
    const res = await api.confirmFingerprintEnroll(clientId)
    setLoading(false)
    if (res.kind === 'ok') {
      setStatus('enrolled')
      Toast.show({ type: 'success', text1: 'Marked as enrolled' })
      onUpdated?.()
    }
  }

  return (
    <View style={themed($card)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm }}>
        <Fingerprint size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text weight="bold" size="sm">{compact ? 'Fingerprint' : `Fingerprint${clientName ? ` · ${clientName}` : ''}`}</Text>
          <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>{statusLabel(status)}</Text>
        </View>
        {pin ? (
          <View style={themed($pinBadge)}>
            <Text size="xs" weight="bold" style={{ color: colors.primary }}>PIN {pin}</Text>
          </View>
        ) : null}
      </View>

      {!compact && (
        <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.sm, lineHeight: 18 }}>
          Tap Register — the device prompts for a finger. Ask the member to place their finger on the entrance device.
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title={status === 'enrolled' || status === 'needs_reenroll' ? 'Re-register' : 'Register fingerprint'}
              variant="primary"
              onPress={startEnroll}
            />
          </View>
          {status === 'pending' && (
            <Pressable onPress={confirm} style={themed($confirmBtn)}>
              <Text size="xs" weight="semiBold" style={{ color: colors.primary }}>Confirm</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  marginBottom: spacing.md,
})

const $pinBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primary + '18',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
})

const $confirmBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
  justifyContent: 'center',
  paddingHorizontal: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.primary,
})
