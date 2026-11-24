import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { format } from 'date-fns'
import Toast from 'react-native-toast-message'
import { Check } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import NoDataFound from '@/components/NoDataFound'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'

type Option = { _id: string; planName: string; price: number; endDate: string; payable: number }
type Context = {
  current: { planName: string; startDate: string; endDate: string; totalAmount: number }
  credit: number
  options: Option[]
  canDiscount: boolean
}

const METHODS = ['Cash', 'UPI', 'Card', 'Transfer']
const day = (value: string) => format(new Date(value), 'd MMM yyyy')
const rupees = (value: number) => `₹${Math.max(0, Math.round(value)).toLocaleString('en-IN')}`

// Moves an active membership to a pricier plan. The whole price of the current plan counts as credit, the start
// date stays, and the client pays the difference now or later (the rest goes on the balance). Rules live on the server.
const UpgradeMembershipScreen = ({ route }: any) => {
  const clientId: string = route?.params?.clientId
  const { themed, theme: { colors, spacing } } = useAppTheme()
  const [context, setContext] = useState<Context | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [discount, setDiscount] = useState('')
  const [received, setReceived] = useState('')
  const [method, setMethod] = useState('Cash')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.upgradeOptions(clientId).then((response) => {
      if (response.kind === 'ok') setContext(response.data)
      else setError(response.message ?? 'Could not load upgrade options')
    })
  }, [clientId])

  const choice = context?.options.find((o) => o._id === planId) ?? null
  const due = useMemo(() => (choice ? choice.payable - (Number(discount) || 0) : 0), [choice, discount])

  // Default to collecting the full difference whenever the plan or discount changes.
  useEffect(() => {
    if (choice) setReceived(String(Math.max(0, due)))
  }, [choice, due])

  const submit = async () => {
    if (!choice) return Toast.show({ type: 'error', text1: 'Pick the new plan' })
    if (due <= 0) return Toast.show({ type: 'error', text1: 'Discount is too large' })
    const amountReceived = Number(received) || 0
    if (amountReceived > due) return Toast.show({ type: 'error', text1: `Received can't be more than ${rupees(due)}` })
    if (!reason.trim()) return Toast.show({ type: 'error', text1: 'Add a reason for the upgrade' })
    setSaving(true)
    const response = await api.upgradeMembership({
      clientId,
      planId: choice._id,
      discount: Number(discount) || 0,
      amountReceived,
      method,
      reason: reason.trim(),
    })
    setSaving(false)
    if (response.kind === 'ok') {
      Toast.show({ type: 'success', text1: 'Membership upgraded', text2: `Now on ${choice.planName}` })
      goBack()
    }
  }

  const input = { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text, backgroundColor: colors.surface }

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header title="Upgrade membership" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      {!context ? (
        error ? <NoDataFound title="Can't upgrade" msg={error} /> : <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
            <View style={themed($card)}>
              <Text size="xxs" weight="semiBold" style={{ color: colors.textDim, letterSpacing: 0.8 }} text="CURRENT PLAN" />
              <Text weight="bold" size="md" style={{ marginTop: 4 }} text={context.current.planName} />
              <Text size="xs" style={{ color: colors.textDim }} text={`${day(context.current.startDate)} – ${day(context.current.endDate)}`} />
              <Text size="xs" style={{ color: colors.success, marginTop: 6 }} text={`${rupees(context.credit)} counts towards the new plan`} />
            </View>

            <Text size="xxs" weight="semiBold" style={{ color: colors.textDim, letterSpacing: 0.8 }} text="NEW PLAN" />
            {context.options.length === 0 ? (
              <NoDataFound title="No higher plan" msg="Add a pricier plan of the same type in Memberships to upgrade." />
            ) : (
              context.options.map((option) => {
                const selected = option._id === planId
                return (
                  <Pressable
                    key={option._id}
                    onPress={() => setPlanId(option._id)}
                    style={[themed($card), selected && { borderColor: colors.primary, borderWidth: 2 }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={$row}>
                      <View style={{ flex: 1 }}>
                        <Text weight="bold" text={option.planName} />
                        <Text size="xs" style={{ color: colors.textDim }} text={`${day(context.current.startDate)} – ${day(option.endDate)} · ${rupees(option.price)}`} />
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text size="xxs" style={{ color: colors.textDim }} text="Pay" />
                        <Text weight="bold" style={{ color: colors.primary }} text={rupees(option.payable)} />
                      </View>
                      {selected ? <Check size={18} color={colors.primary} style={{ marginLeft: 8 }} /> : null}
                    </View>
                  </Pressable>
                )
              })
            )}

            {choice ? (
              <View style={[themed($card), { gap: spacing.sm }]}>
                {context.canDiscount ? (
                  <TextInput placeholder="Discount (optional)" keyboardType="number-pad" value={discount} onChangeText={setDiscount} style={input} placeholderTextColor={colors.textDim} accessibilityLabel="Discount" />
                ) : null}
                <View style={$row}>
                  <Text size="sm" style={{ flex: 1, color: colors.textDim }} text="Difference to pay" />
                  <Text weight="bold" text={rupees(due)} />
                </View>
                <TextInput placeholder="Amount received now" keyboardType="number-pad" value={received} onChangeText={setReceived} style={input} placeholderTextColor={colors.textDim} accessibilityLabel="Amount received now" />
                {due - (Number(received) || 0) > 0 ? (
                  <Text size="xs" style={{ color: colors.warning }} text={`${rupees(due - (Number(received) || 0))} will be added to the client's balance`} />
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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
                <TextInput placeholder="Reason (required)" value={reason} onChangeText={setReason} style={input} placeholderTextColor={colors.textDim} accessibilityLabel="Reason" />
              </View>
            ) : null}
          </ScrollView>
          <View style={themed($footer)}>
            <Button title={saving ? 'Upgrading...' : 'Upgrade'} onPress={submit} disabled={!choice || saving} />
          </View>
        </>
      )}
    </Screen>
  )
}

export default UpgradeMembershipScreen

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
})

const $row: ViewStyle = { flexDirection: 'row', alignItems: 'center' }

const $chip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
})

const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.background,
})
