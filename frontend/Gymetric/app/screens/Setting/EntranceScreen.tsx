import { Alert, ScrollView, View, ViewStyle } from 'react-native'
import React, { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { CalendarCheck, DoorOpen, Fingerprint } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/Button'
import { Header } from '@/components/Header'
import { Skeleton } from '@/components/Skeleton'
import { Switch } from '@/components/Toggle/Switch'
import { MenuRow, MenuSection } from '@/components/common/MenuRow'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { ThemedStyle } from '@/theme/types'
import { usePermissions } from '@/utils/permissions'
import { formatTimeOfDay } from '@/utils/time'

type Device = {
  enabled: boolean
  paired: boolean
  online: boolean
  serialNumber: string | null
  lastHeartbeatAt: string | null
  admsHost?: string
  admsPort?: number
}

const lastSeen = (iso: string | null) => {
  if (!iso) return 'Never connected'
  const date = new Date(iso)
  const today = new Date().toDateString() === date.toDateString()
  return `Last seen ${today ? 'today' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${formatTimeOfDay(date)}`
}

const EntranceScreen = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const can = usePermissions()
  const canManage = can('entrance.manage')
  const canOpen = can('door.open')
  const [device, setDevice] = useState<Device | null>(null)
  const [serial, setSerial] = useState('')
  const [busy, setBusy] = useState<'toggle' | 'pair' | 'open' | null>(null)

  const load = useCallback(async () => {
    const response = await api.biometricDevice()
    if (response.kind === 'ok') setDevice(response.data)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const toggle = async (value: boolean) => {
    setBusy('toggle')
    const response = await api.biometricEnabled(value)
    setBusy(null)
    if (response.kind === 'ok') setDevice(response.data)
  }

  const pair = async () => {
    if (!serial.trim()) return
    setBusy('pair')
    const response = await api.pairReader(serial.trim())
    setBusy(null)
    if (response.kind === 'ok') {
      setDevice(response.data)
      setSerial('')
      Toast.show({ type: 'success', text1: 'Reader paired' })
    }
  }

  const unpair = () =>
    Alert.alert('Unpair reader?', 'Fingerprints stay saved. Pair the same reader again to keep using them.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unpair',
        style: 'destructive',
        onPress: async () => {
          const response = await api.unpairReader()
          if (response.kind === 'ok') setDevice(response.data)
        },
      },
    ])

  const open = async () => {
    setBusy('open')
    const started = await api.openDoor()
    if (started.kind !== 'ok') {
      setBusy(null)
      return
    }
    const commandId = started.data?.commandId
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const status = await api.doorCommand(commandId)
      if (status.kind === 'ok' && status.data?.status === 'acked') {
        Toast.show({ type: 'success', text1: 'Door opened' })
        setBusy(null)
        return
      }
    }
    Toast.show({ type: 'info', text1: 'Sent to the reader', text2: 'It opens when the reader next checks in.' })
    setBusy(null)
  }

  return (
    <Screen preset="fixed" contentContainerStyle={{ flex: 1 }} safeAreaEdges={['bottom']}>
      <Header title="Entrance reader" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {!device ? (
          <Skeleton width="100%" height={72} borderRadius={20} />
        ) : (
          <>
            <MenuSection>
              <MenuRow
                icon={Fingerprint}
                label="Use entrance reader"
                description={device.enabled ? 'Clients open the door with a fingerprint' : 'Turn on to control the door by membership'}
                right={canManage ? <Switch value={device.enabled} onValueChange={(value) => busy !== 'toggle' && toggle(value)} /> : (
                  <Text size="xxs" weight="semiBold" style={{ color: device.enabled ? colors.success : colors.textDim }} text={device.enabled ? 'ON' : 'OFF'} />
                )}
              />
            </MenuSection>

            {device.enabled ? (
              <>
                <View style={themed($card)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <View style={[themed($statusDot), { backgroundColor: device.online ? colors.success : device.paired ? colors.warning : colors.border }]} />
                    <Text weight="semiBold" text={device.paired ? (device.online ? 'Reader online' : 'Reader offline') : 'No reader paired'} />
                  </View>
                  {device.paired ? (
                    <>
                      <Text size="xs" style={{ color: colors.textDim, marginTop: 4 }} text={`Serial ${device.serialNumber}`} />
                      <Text size="xs" style={{ color: colors.textDim }} text={lastSeen(device.lastHeartbeatAt)} />
                      {canManage && device.admsHost ? (
                        <Text size="xxs" style={{ color: colors.textDim, marginTop: spacing.xs }} text={`Server on the reader: ${device.admsHost}:${device.admsPort}`} />
                      ) : null}
                    </>
                  ) : (
                    <Text size="xs" style={{ color: colors.textDim, marginTop: 4 }} text="Enter the serial number printed on the back of the reader." />
                  )}

                  {canManage && !device.paired ? (
                    <View style={{ marginTop: spacing.md }}>
                      <TextField label="Serial number" value={serial} onChangeText={setSerial} autoCapitalize="characters" autoCorrect={false} />
                      <Button title="Pair reader" onPress={pair} loading={busy === 'pair'} disabled={!serial.trim()} style={{ marginTop: spacing.sm }} />
                    </View>
                  ) : null}
                  {canManage && device.paired ? (
                    <Button title="Unpair" variant="ghost" onPress={unpair} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} textStyle={{ color: colors.error }} />
                  ) : null}
                </View>

                {canOpen ? (
                  <Button
                    title="Open door"
                    onPress={open}
                    loading={busy === 'open'}
                    disabled={!device.paired}
                    LeftAccessory={() => <DoorOpen size={18} color={colors.white} style={{ marginRight: 8 }} />}
                    style={{ marginTop: spacing.md }}
                  />
                ) : null}

                <View style={{ marginTop: spacing.lg }}>
                  <MenuSection>
                    <MenuRow icon={CalendarCheck} label="Today's check-ins" description="Who came in and who was refused" onPress={() => navigate('Attendance')} />
                  </MenuSection>
                </View>
              </>
            ) : (
              <Text size="xs" style={{ color: colors.textDim, marginHorizontal: 4 }} text="When the reader is on, only clients with an active membership and no pending balance can enter. Staff punches are recorded for attendance." />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

export default EntranceScreen

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
})

const $statusDot: ThemedStyle<ViewStyle> = () => ({ width: 10, height: 10, borderRadius: 5 })
