import { View, ScrollView, ViewStyle } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { Switch } from '@/components/Toggle/Switch'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/Button'
import { api } from '@/services/Api'
import Toast from 'react-native-toast-message'
import { selectLoading, setLoading } from '@/redux/state/GymStates'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import { Ionicons } from '@expo/vector-icons'
import { goBack } from '@/navigators/navigationUtilities'
import { Skeleton } from '@/components/Skeleton'

const NotificationSetting = ({ navigation }: any) => {
    const { theme: { colors }, themed } = useAppTheme()
    const dispatch = useAppDispatch();
    const loading = useAppSelector(selectLoading);

    const [isLoading, setIsLoading] = useState(true);

    // State for settings
    const [settings, setSettings] = useState({
        active: false,
        sendOnOnboarding: true,
        sendOnRenewal: true,
        sendOnExpiry: true,
        sendOnReminder: true,
        reminderDays: '3'
    });

    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        const response = await api.getSettings();
        if (response.kind === 'ok') {
            const data = response.data?.whatsapp || {};
            setSettings({
                active: data.active ?? false,
                sendOnOnboarding: data.sendOnOnboarding ?? true,
                sendOnRenewal: data.sendOnRenewal ?? true,
                sendOnExpiry: data.sendOnExpiry ?? true,
                sendOnReminder: data.sendOnReminder ?? true,
                reminderDays: String(data.reminderDays ?? 3),
            });
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        dispatch(setLoading({ loading: true }));
        const payload = {
            whatsapp: {
                active: settings.active,
                sendOnOnboarding: settings.sendOnOnboarding,
                sendOnRenewal: settings.sendOnRenewal,
                sendOnExpiry: settings.sendOnExpiry,
                sendOnReminder: settings.sendOnReminder,
                reminderDays: parseInt(settings.reminderDays) || 3
            }
        };

        const response = await api.updateSettings(payload);
        if (response.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Settings updated successfully' });
            setHasChanges(false);
            navigation.goBack();
        }
        dispatch(setLoading({ loading: false }));
    };

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    return (
        <Screen preset="fixed" contentContainerStyle={[$styles.flex1]} safeAreaEdges={["bottom"]}>
            <Header
                title='Notification Settings'
                leftIcon="caretLeft"
                onLeftPress={goBack}
                backgroundColor={colors.background}
            />
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                {isLoading ? (
                    <View style={[themed($card)]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Skeleton width={150} height={20} />
                            <Skeleton width={40} height={20} borderRadius={12} />
                        </View>
                        <Skeleton width="100%" height={14} />
                    </View>
                ) : (
                    <>
                        <View style={[themed($card), { marginBottom: spacing.lg }]}>
                            <Switch
                                label="Enable WhatsApp Integration"
                                value={settings.active}
                                onValueChange={(val: boolean) => updateSetting('active', val)}
                            />
                            <Text size="xs" style={{ color: colors.textDim, marginTop: spacing.xs }}>
                                Enable or disable all WhatsApp automated messages.
                            </Text>
                        </View>

                        {settings.active && (
                            <>
                                <Text preset="subheading" style={{ marginBottom: spacing.sm, marginLeft: spacing.xs }}>Automated Messages</Text>

                                <View style={[themed($card)]}>
                                    <Switch
                                        label="Welcome Message"
                                        value={settings.sendOnOnboarding}
                                        onValueChange={(val: boolean) => updateSetting('sendOnOnboarding', val)}
                                    />
                                    <View style={[themed($divider), { marginVertical: spacing.sm }]} />

                                    <Switch
                                        label="Renewal Confirmation"
                                        value={settings.sendOnRenewal}
                                        onValueChange={(val: boolean) => updateSetting('sendOnRenewal', val)}
                                    />
                                    <View style={[themed($divider), { marginVertical: spacing.sm }]} />

                                    <Switch
                                        label="Expiry Notification"
                                        value={settings.sendOnExpiry}
                                        onValueChange={(val: boolean) => updateSetting('sendOnExpiry', val)}
                                    />
                                    <View style={[themed($divider), { marginVertical: spacing.sm }]} />

                                    <Switch
                                        label="Reminder Notification"
                                        helper="Send a reminder before membership expires"
                                        value={settings.sendOnReminder}
                                        onValueChange={(val: boolean) => updateSetting('sendOnReminder', val)}
                                        containerStyle={{ marginBottom: spacing.sm }}
                                    />

                                    {settings.sendOnReminder && (
                                        <View style={{ marginTop: spacing.xs }}>
                                            <TextField
                                                label="Days before expiry"
                                                value={settings.reminderDays}
                                                onChangeText={(val: string) => updateSetting('reminderDays', val)}
                                                keyboardType="numeric"
                                                placeholder="e.g. 3"
                                                returnKeyType="done"
                                                onSubmitEditing={handleSave}
                                                containerStyle={{ backgroundColor: colors.surface }}
                                                inputWrapperStyle={{ backgroundColor: colors.background }}
                                            />
                                            <Text size="xs" style={{ color: colors.textDim, marginTop: 15, marginLeft: 5 }}>
                                                Default is 3 days.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </>
                )}

            </ScrollView>

            <View style={themed($footer)}>
                <Button
                    title={loading ? 'Saving...' : 'Save Changes'}
                    variant="primary"
                    LeftAccessory={() => <Ionicons name='save' size={20} color={colors.white} style={{ marginRight: 10 }} />}
                    onPress={handleSave}
                />
            </View>
        </Screen>
    )
}

export default NotificationSetting

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})

const $divider: ThemedStyle<ViewStyle> = ({ colors }) => ({
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    borderTopWidth: 1,
    padding: spacing.md,
    borderColor: colors.border,
})

