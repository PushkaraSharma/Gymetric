import { ActivityIndicator, Image, ImageStyle, Pressable, View, ScrollView, ViewStyle } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { useAppTheme } from '@/theme/context'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { Switch } from '@/components/Toggle/Switch'
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
import { useImagePicker } from '@/utils/useImagePicker'
import { Image as ImageIcon } from 'lucide-react-native'

const NotificationSetting = ({ navigation }: any) => {
    const { theme: { colors }, themed } = useAppTheme()
    const dispatch = useAppDispatch();
    const loading = useAppSelector(selectLoading);

    const [isLoading, setIsLoading] = useState(true);
    const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);
    const { showImagePickerOptions, ImagePickerSheet } = useImagePicker();

    // State for settings
    const [settings, setSettings] = useState({
        active: false,
        sendOnOnboarding: true,
        sendOnRenewal: true,
        sendOnExpiry: true,
        sendOnReminder: true,
        headerImageUrl: '',
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
                headerImageUrl: data.headerImageUrl ?? '',
            });
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (settings.active && !settings.headerImageUrl) {
            Toast.show({
                type: 'error',
                text1: 'Welcome image required',
                text2: 'Upload an image before enabling WhatsApp.',
            })
            return
        }
        dispatch(setLoading({ loading: true }));
        const payload = {
            whatsapp: {
                active: settings.active,
                sendOnOnboarding: settings.sendOnOnboarding,
                sendOnRenewal: settings.sendOnRenewal,
                sendOnExpiry: settings.sendOnExpiry,
                sendOnReminder: settings.sendOnReminder,
                reminderDays: 1,
                headerImageUrl: settings.headerImageUrl,
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

    const handleToggleActive = (val: boolean) => {
        if (val && !settings.headerImageUrl) {
            Toast.show({
                type: 'error',
                text1: 'Upload a welcome image first',
                text2: 'WhatsApp messages fail without it.',
            })
            return
        }
        updateSetting('active', val)
    }

    const handleHeaderUpload = () => {
        showImagePickerOptions(async (uri) => {
            setUploadingHeaderImage(true);
            const res = await api.uploadWhatsappHeaderImage(uri);
            setUploadingHeaderImage(false);
            if (res.kind === 'ok' && res.data?.url) {
                updateSetting('headerImageUrl', res.data.url);
            }
        });
    };

    return (
        <Screen preset="fixed" contentContainerStyle={[$styles.flex1]} safeAreaEdges={["bottom"]}>
            <Header
                title='WhatsApp Settings'
                leftIcon="caretLeft"
                onLeftPress={goBack}
                backgroundColor={colors.background}
                safeAreaTop
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
                                onValueChange={handleToggleActive}
                            />
                            <Text size="xs" style={{ color: colors.textDim }}>
                                Enable or disable all WhatsApp automated messages.
                            </Text>
                        </View>

                        <View style={[themed($card), { marginBottom: spacing.lg }]}>
                            <Text weight="semiBold">Welcome image</Text>
                            <Text size="xs" style={{ color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.md }}>
                                Shown at the top of the welcome WhatsApp. Tap to upload or replace.
                            </Text>
                            <Pressable
                                onPress={handleHeaderUpload}
                                disabled={uploadingHeaderImage}
                                style={themed($imageFrame)}
                            >
                                {settings.headerImageUrl ? (
                                    <Image source={{ uri: settings.headerImageUrl }} style={$previewImage} resizeMode="cover" />
                                ) : (
                                    <Skeleton width="100%" height="100%" borderRadius={0} style={$skeletonFill} />
                                )}
                                <View
                                    style={themed(settings.headerImageUrl ? $replaceBar : $uploadOverlay)}
                                    pointerEvents="none"
                                >
                                    {uploadingHeaderImage ? (
                                        <ActivityIndicator color={settings.headerImageUrl ? colors.white : colors.primary} />
                                    ) : (
                                        <>
                                            <ImageIcon size={18} color={settings.headerImageUrl ? colors.white : colors.primary} />
                                            <Text
                                                size="sm"
                                                weight="semiBold"
                                                style={{ color: settings.headerImageUrl ? colors.white : colors.primary }}
                                            >
                                                {settings.headerImageUrl ? 'Replace' : 'Upload image'}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </Pressable>
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
                                        helper="Sends 1 day before membership expires"
                                        value={settings.sendOnReminder}
                                        onValueChange={(val: boolean) => updateSetting('sendOnReminder', val)}
                                    />
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
            <ImagePickerSheet />
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

const $imageFrame: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
})

const $skeletonFill: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
}

const $uploadOverlay: ThemedStyle<ViewStyle> = () => ({
    ...$skeletonFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
})

const $replaceBar: ThemedStyle<ViewStyle> = () => ({
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
})

const $previewImage: ImageStyle = {
    width: '100%',
    height: '100%',
}

