import React, { useState } from 'react'
import { ScrollView, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { useAppSelector } from '@/redux/Hooks'
import { selectGymInfo } from '@/redux/state/GymStates'
import Config from '@/config'
import Toast from 'react-native-toast-message'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'

const SeedDataScreen = () => {
  const { theme: { colors }, themed } = useAppTheme()
  const gymInfo = useAppSelector(selectGymInfo)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const runAction = async (action: 'seed' | 'clear') => {
    const expected = action === 'seed' ? 'SEED' : 'CLEAR'
    if (confirmText.trim().toUpperCase() !== expected) {
      Toast.show({ type: 'error', text1: `Type ${expected} to confirm` })
      return
    }

    setLoading(true)
    setLog([])
    const res = await api.seedDemoData(action)
    setLoading(false)

    if (res.kind === 'ok') {
      const data = res.data as any
      const lines = [data.message, ...(data.log || [])]
      setLog(lines)
      Toast.show({ type: 'success', text1: data.message })
      setConfirmText('')
    } else {
      Toast.show({ type: 'error', text1: res.message || 'Action failed' })
    }
  }

  return (
    <Screen preset="fixed" safeAreaEdges={[]}>
      <Header title="Seed Demo Data" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={themed($infoBox)}>
          <Text size="xs" style={{ color: colors.textDim }}>Target Gym</Text>
          <Text weight="semiBold">{gymInfo?.name || 'Current gym'}</Text>
          <Text size="xs" style={{ color: colors.textDim, marginTop: spacing.sm }}>API</Text>
          <Text size="xs">{Config.API_URL}</Text>
        </View>

        <Text style={{ color: colors.textDim, marginBottom: spacing.md }} size="sm">
          Creates ~70 demo clients with 6 months of history (memberships, payments, balances, couples, groups).
          Only affects clients tagged as seeded (phones 9000000001–9000000080).
        </Text>

        <TextField
          label="Confirmation"
          placeholder='Type SEED or CLEAR'
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          containerStyle={{ marginBottom: spacing.md }}
        />

        <Button
          title={loading ? 'Working...' : 'Seed Demo Data'}
          onPress={() => runAction('seed')}
          disabled={loading}
          style={{ marginBottom: spacing.sm }}
        />
        <Button
          title="Clear Seeded Data"
          variant="outline"
          onPress={() => runAction('clear')}
          disabled={loading}
        />

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

        {log.length > 0 && (
          <View style={themed($logBox)}>
            {log.map((line, i) => (
              <Text key={i} size="xs" style={{ color: colors.text, marginBottom: 4 }}>{line}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

export default SeedDataScreen

const $infoBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
})

const $logBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginTop: spacing.lg,
  backgroundColor: colors.surface,
  borderRadius: 12,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})
