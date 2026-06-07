import React, { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { spacing } from '@/theme/spacing'
import { Switch } from '@/components/Toggle/Switch'
import { registerPushToken } from '@/services/pushNotificationService'
import Toast from 'react-native-toast-message'

const PushNotificationSettings = () => {
    const { theme: { colors } } = useAppTheme()
    const [enabled, setEnabled] = useState(true)
    const [prefs, setPrefs] = useState({
        expiringToday: true,
        expiringSoon: true,
        outstandingBalance: true,
        dailySummary: true,
    })

    useEffect(() => {
        api.getPushPrefs().then((res) => {
            if (res.kind === 'ok' && res.data) {
                setEnabled(res.data.pushNotificationsEnabled !== false)
                if (res.data.pushPrefs) setPrefs({ ...prefs, ...res.data.pushPrefs })
            }
        })
        registerPushToken()
    }, [])

    const togglePref = async (key: keyof typeof prefs, value: boolean) => {
        const updated = { ...prefs, [key]: value }
        setPrefs(updated)
        await api.updatePushPrefs({ pushPrefs: updated })
    }

    const toggleEnabled = async (value: boolean) => {
        setEnabled(value)
        await api.updatePushPrefs({ pushNotificationsEnabled: value })
        if (value) await registerPushToken()
        Toast.show({ type: 'success', text1: value ? 'Notifications enabled' : 'Notifications disabled' })
    }

    const PrefRow = ({ label, prefKey }: { label: string; prefKey: keyof typeof prefs }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text>{label}</Text>
            <Switch value={prefs[prefKey]} onPress={() => togglePref(prefKey, !prefs[prefKey])} />
        </View>
    )

    return (
        <Screen preset="fixed">
            <Header title="Push Notifications" leftIcon="caretLeft" onLeftPress={goBack} safeAreaTop backgroundColor={colors.surface} />
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <Text size="xs" style={{ color: colors.textDim, marginBottom: spacing.lg }}>
                    Get daily reminders about expiries and outstanding balances even when you don't open the app.
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                    <Text preset='subheading' weight="semiBold">Enable notifications</Text>
                    <Switch value={enabled} onPress={() => toggleEnabled(!enabled)} />
                </View>
                <Text preset="subheading" style={{ marginBottom: spacing.sm }}>Alert types</Text>
                <PrefRow label="Daily summary" prefKey="dailySummary" />
                <PrefRow label="Expiring today" prefKey="expiringToday" />
                <PrefRow label="Expiring soon (7 days)" prefKey="expiringSoon" />
                <PrefRow label="Outstanding balance" prefKey="outstandingBalance" />
            </ScrollView>
        </Screen>
    )
}

export default PushNotificationSettings
