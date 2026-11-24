import React, { useEffect, useState } from 'react'
import { Keyboard, Modal, Pressable, TextInput, TouchableWithoutFeedback, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { format } from 'date-fns'
import Toast from 'react-native-toast-message'
import { Trash2 } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { ThemedStyle } from '@/theme/types'
import { api } from '@/services/Api'
import ToastApp from '@/components/common/ToastApp'

const METHODS = ['Cash', 'UPI', 'Card', 'Transfer']

type Props = {
  visible: boolean
  onClose: () => void
  clientId: string
  payment: { _id: string; amount: number; method?: string; date?: string; remarks?: string } | null
  canEdit: boolean
  canDelete: boolean
  onSaved: () => void
}

// Correct a recorded payment: fix the amount or method, or delete it. Either way the difference goes back on
// the client's balance, and a reason is kept in the activity log.
const EditPaymentModal = ({ visible, onClose, clientId, payment, canEdit, canDelete, onSaved }: Props) => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [reason, setReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible || !payment) return
    setAmount(String(payment.amount ?? ''))
    setMethod(METHODS.find((m) => m.toLowerCase() === (payment.method ?? '').toLowerCase()) ?? 'Cash')
    setReason('')
    setConfirmDelete(false)
  }, [visible, payment])

  if (!payment) return null

  const finish = (message: string) => {
    Toast.show({ type: 'success', text1: message })
    onSaved()
    onClose()
  }

  const save = async () => {
    const value = Number(amount)
    if (!value || value <= 0) return Toast.show({ type: 'error', text1: 'Enter a valid amount' })
    if (!reason.trim()) return Toast.show({ type: 'error', text1: 'Add a reason for the change' })
    setSaving(true)
    const response = await api.editPayment(clientId, payment._id, { amount: value, method, reason: reason.trim() })
    setSaving(false)
    if (response.kind === 'ok') finish('Payment updated')
  }

  const remove = async () => {
    if (!reason.trim()) return Toast.show({ type: 'error', text1: 'Add a reason for deleting this payment' })
    setSaving(true)
    const response = await api.deletePayment(clientId, payment._id, reason.trim())
    setSaving(false)
    if (response.kind === 'ok') finish('Payment deleted')
  }

  const input = { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 16, color: colors.text }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={themed($overlay)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={themed($container)}>
              <Text preset="subheading" weight="bold" text={confirmDelete ? 'Delete this payment?' : 'Payment'} />
              <Text style={{ color: colors.textDim, marginVertical: spacing.xs }}>
                {`₹${payment.amount} · ${payment.method ?? ''}${payment.date ? ` · ${format(new Date(payment.date), 'dd MMM yyyy')}` : ''}`}
              </Text>

              {confirmDelete ? (
                <Text size="sm" style={{ marginBottom: spacing.md }} text={`₹${payment.amount} goes back on the client's balance. This can't be undone.`} />
              ) : canEdit ? (
                <>
                  <TextInput placeholder="Amount" keyboardType="number-pad" value={amount} onChangeText={setAmount} style={input} placeholderTextColor={colors.textDim} accessibilityLabel="Amount" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.md }}>
                    {METHODS.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setMethod(type)}
                        style={[themed($chip), method === type && { borderColor: colors.tint, borderWidth: 2 }]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: method === type }}
                      >
                        <MaterialCommunityIcons
                          name={type === 'UPI' ? 'qrcode-scan' : type === 'Cash' ? 'cash-multiple' : type === 'Card' ? 'credit-card' : 'bank'}
                          size={16}
                          color={method === type ? colors.tint : colors.textDim}
                        />
                        <Text size="xs" style={{ marginLeft: 4, color: method === type ? colors.tint : colors.textDim }}>{type}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              {canEdit || confirmDelete ? (
                <TextInput placeholder="Reason (required)" value={reason} onChangeText={setReason} style={input} placeholderTextColor={colors.textDim} accessibilityLabel="Reason" />
              ) : null}

              {confirmDelete ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button title="Back" variant="outline" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
                  <Button title={saving ? 'Deleting...' : 'Delete'} style={{ flex: 1, backgroundColor: colors.error }} onPress={remove} disabled={saving} />
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Button title="Close" variant="outline" style={{ flex: 1 }} onPress={onClose} />
                    {canEdit ? <Button title={saving ? 'Saving...' : 'Save'} style={{ flex: 1 }} onPress={save} disabled={saving} /> : null}
                  </View>
                  {canDelete ? (
                    <Pressable style={$deleteRow} onPress={() => setConfirmDelete(true)} accessibilityRole="button">
                      <Trash2 size={16} color={colors.error} />
                      <Text size="sm" weight="semiBold" style={{ color: colors.error }} text="Delete payment" />
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <ToastApp />
    </Modal>
  )
}

export default EditPaymentModal

const $overlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
})

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 20,
  padding: spacing.lg,
  width: '100%',
  maxWidth: 360,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
})

const $deleteRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 4 }
