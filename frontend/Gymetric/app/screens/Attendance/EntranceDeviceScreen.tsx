import React, { useCallback, useState } from 'react'
import { Pressable, ScrollView, TextInput, View, ViewStyle, TextStyle } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import Toast from 'react-native-toast-message'
import { useFocusEffect } from '@react-navigation/native'
import { Fingerprint, Wifi, WifiOff } from 'lucide-react-native'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { Switch } from '@/components/Toggle/Switch'
import Config from '@/config'

// Shown to owners in the setup steps — derived from the API the app talks to.
const apiUrl = new URL(Config.API_URL)
const SERVER_HOST = apiUrl.hostname
const SERVER_PORT = apiUrl.port || (apiUrl.protocol === 'https:' ? '443' : '80')

const EntranceDeviceScreen = () => {
  const { theme: { colors }, themed } = useAppTheme()
  const [serial, setSerial] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [device, setDevice] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showUnpair, setShowUnpair] = useState(false)

  const load = useCallback(async () => {
    const res = await api.getBiometricDevice()
    if (res.kind === 'ok') {
      setDevice(res.data)
      setEnabled(!!res.data?.enabled)
      if (res.data?.serialNumber) setSerial(res.data.serialNumber)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handlePair = async () => {
    if (!serial.trim()) {
      Toast.show({ type: 'error', text1: 'Enter device serial number' })
      return
    }
    setLoading(true)
    const res = await api.pairBiometricDevice(serial.trim().toUpperCase(), 'Entrance')
    setLoading(false)
    if (res.kind === 'ok') {
      Toast.show({ type: 'success', text1: 'Device paired' })
      load()
    }
  }

  const handleToggle = async (next: boolean) => {
    setEnabled(next)
    const res = await api.setAttendanceEnabled(next)
    if (res.kind === 'ok') {
      await api.gymInfo()
      Toast.show({
        type: 'success',
        text1: next ? 'Attendance turned on' : 'Attendance turned off',
      })
    } else {
      setEnabled(!next)
    }
  }

  const handleUnpair = async () => {
    setShowUnpair(false)
    setLoading(true)
    const res = await api.unpairBiometricDevice()
    setLoading(false)
    if (res.kind === 'ok') {
      Toast.show({ type: 'success', text1: 'Device unpaired' })
      load()
    }
  }

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header title="Entrance Device" leftIcon="back" onLeftPress={goBack} safeAreaTop/>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={themed($card)}>
          <Switch
            label="Attendance"
            helper={enabled
              ? 'Check-ins, fingerprints, and the entrance reader are available in the app.'
              : 'Off until you have a fingerprint machine. Nothing attendance-related is shown to you.'}
            value={enabled}
            onValueChange={handleToggle}
          />
        </View>

        {enabled && <>
        <View style={themed($card)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm }}>
            <Fingerprint size={22} color={colors.primary} />
            <Text weight="bold" size="md">Fingerprint reader</Text>
          </View>
          <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.md }}>
            Pair your gym’s fingerprint machine. It opens the door on its own; Gymetric tells it which members are allowed in and records every scan as attendance.
          </Text>

          {device?.paired ? (
            <View style={themed($statusBox)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {device.online ? <Wifi size={18} color="#22c55e" /> : <WifiOff size={18} color={colors.error} />}
                <Text weight="semiBold">{device.online ? 'Online' : 'Waiting for heartbeat'}</Text>
              </View>
              <Text size="xs" style={{ color: colors.textDim, marginTop: 6 }}>SN: {device.serialNumber}</Text>
              {device.lastHeartbeatAt && (
                <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>
                  Last seen: {new Date(device.lastHeartbeatAt).toLocaleString()}
                </Text>
              )}
              <Text size="xs" style={{ color: colors.textDim, marginTop: 2 }}>
                Pending commands: {device.pendingCommands ?? 0}
              </Text>
            </View>
          ) : (
            <Text size="sm" style={{ color: colors.textDim, marginBottom: spacing.sm }}>No device paired yet.</Text>
          )}

          <Text size="xs" weight="semiBold" style={{ marginTop: spacing.md, marginBottom: 6 }}>Device serial number</Text>
          <TextInput
            value={serial}
            onChangeText={setSerial}
            autoCapitalize="characters"
            placeholder="e.g. CJKE201760001"
            placeholderTextColor={colors.textDim}
            style={themed($input)}
          />

          <Button
            title={loading ? 'Saving...' : device?.paired ? 'Update / re-pair' : 'Pair device'}
            variant="primary"
            onPress={handlePair}
            disabled={loading}
            style={{ marginTop: spacing.sm }}
          />
          {device?.paired && (
            <Pressable onPress={() => setShowUnpair(true)} style={{ marginTop: spacing.md, alignItems: 'center' }}>
              <Text size="sm" style={{ color: colors.error }}>Unpair device</Text>
            </Pressable>
          )}
        </View>

        <View style={themed($card)}>
          <Text weight="bold" size="sm" style={{ marginBottom: 8 }}>How to connect your reader</Text>
          <Text size="xs" style={{ color: colors.textDim, lineHeight: 18 }}>
            1. Connect the fingerprint machine to your gym Wi-Fi or LAN.{'\n'}
            2. On the machine, open Menu → Comm. → Cloud Server (also called ADMS or Push).{'\n'}
            3. Enable it, turn on “Domain Name”, and enter:{'\n'}
            {'    '}Server address: {SERVER_HOST}{'\n'}
            {'    '}Port: {SERVER_PORT}{'\n'}
            4. Find the serial number under Menu → System Info → Device Info, type it above and tap Pair.{'\n'}
            5. Within a minute the status above should change to Online.
          </Text>
          <Text size="xs" style={{ color: colors.textDim, marginTop: spacing.sm, lineHeight: 18 }}>
            Works with ZKTeco and eSSL fingerprint machines that support Cloud / ADMS push. If yours doesn't show the option, ask your dealer for the ADMS-enabled firmware.
          </Text>
        </View>

        <View style={themed($card)}>
          <Text weight="bold" size="sm" style={{ marginBottom: 8 }}>How it works</Text>
          <Text size="xs" style={{ color: colors.textDim, lineHeight: 18 }}>
            • Register a member’s fingerprint from their profile — the machine will ask for their finger.{'\n'}
            • Active and trial members can open the door. Expired, paused, and not-yet-started memberships are blocked on the machine automatically.{'\n'}
            • When a membership is renewed or expires, access updates on the machine within a few seconds.{'\n'}
            • Every scan appears in Attendance and counts on your Home screen.
          </Text>
        </View>
        </>}
      </ScrollView>

      <ConfirmationModal
        visible={showUnpair}
        title="Unpair device?"
        message="The entrance reader will stop syncing until you pair again."
        confirmText="Unpair"
        onConfirm={handleUnpair}
        onClose={() => setShowUnpair(false)}
      />
    </Screen>
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

const $statusBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderRadius: 12,
  padding: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
})

const $input: ThemedStyle<TextStyle> = ({ colors }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: colors.text,
  backgroundColor: colors.background,
})

export default EntranceDeviceScreen
