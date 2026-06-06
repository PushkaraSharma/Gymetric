import React from 'react'
import { View, StyleSheet, Pressable, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AlertTriangle, LogOut } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'

interface ConfirmationModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmationModalProps) {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const insets = useSafeAreaInsets()

  const iconColor = variant === 'danger' ? colors.error : colors.primary
  const IconComponent = variant === 'danger' ? LogOut : AlertTriangle

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={[themed($content), { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[themed($iconBox), { backgroundColor: iconColor + '15' }]}>
            <IconComponent size={32} color={iconColor} />
          </View>
          <Text preset="bold" style={themed($title)} text={title} />
          <Text style={themed($message)} text={message} />
          <View style={styles.actions}>
            <Button
              text={cancelText}
              preset="default"
              style={[styles.actionBtn, themed($cancelBtn)]}
              onPress={onClose}
              disabled={loading}
            />
            <Button
              text={confirmText}
              preset="filled"
              style={[styles.actionBtn, variant === 'danger' && { backgroundColor: colors.error }]}
              onPress={onConfirm}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtn: { flex: 1 },
})

const $content = ({ colors, spacing }: any) => ({
  backgroundColor: colors.surface,
  borderTopLeftRadius: 32,
  borderTopRightRadius: 32,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  alignItems: 'center' as const,
})

const $iconBox = ({ spacing }: any) => ({
  width: 64,
  height: 64,
  borderRadius: 32,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  marginBottom: spacing.md,
})

const $title = ({ colors, spacing }: any) => ({
  fontSize: 22,
  color: colors.text,
  marginBottom: spacing.sm,
  textAlign: 'center' as const,
})

const $message = ({ colors, spacing }: any) => ({
  fontSize: 16,
  color: colors.textDim,
  textAlign: 'center' as const,
  lineHeight: 24,
  marginBottom: spacing.xl,
})

const $cancelBtn = ({ colors }: any) => ({
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
})
