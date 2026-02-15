import { View, ViewStyle, ScrollView, Platform } from 'react-native'
import React, { useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/Button'
import { Header } from '@/components/Header'
import { goBack } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import Toast from 'react-native-toast-message'
import { useAppDispatch } from '@/redux/Hooks'
import { setLoading } from '@/redux/state/GymStates'
import { ThemedStyle } from '@/theme/types'

const ChangePassword = () => {
    const { theme: { colors, spacing }, themed } = useAppTheme()
    const dispatch = useAppDispatch()

    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleUpdate = async () => {
        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'New passwords do not match' })
            return
        }
        if (newPassword.length < 6) {
            Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' })
            return
        }

        dispatch(setLoading({ loading: true }))
        const response = await api.resetPassword(oldPassword, newPassword)
        dispatch(setLoading({ loading: false }))

        if (response.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Password updated successfully' })
            goBack()
        } else {
            Toast.show({ type: 'error', text1: response.message || 'Failed to update password' })
        }
    }

    return (
        <Screen
            preset={'fixed'}
            contentContainerStyle={[$styles.flex1]}
            safeAreaEdges={["bottom"]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <Header
                title="Change Password"
                leftIcon="caretLeft"
                onLeftPress={goBack}
                backgroundColor={colors.surface}
            />
            <ScrollView style={{ flex: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.md }}>
                <Text size='xs' style={{ marginBottom: spacing.lg, color: colors.textDim }}>
                    Enter your old password and a new secure password to update your account access.
                </Text>

                <TextField
                    label="Old Password (Optional)"
                    placeholder="Enter current password if known"
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    containerStyle={themed($textField)}
                    secureTextEntry
                />

                <TextField
                    label="New Password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    containerStyle={themed($textField)}
                    secureTextEntry
                />

                <TextField
                    label="Confirm New Password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    containerStyle={themed($textField)}
                    secureTextEntry
                />

                <Button
                    text="Update Password"
                    preset="reversed"
                    style={{ marginTop: spacing.xl }}
                    onPress={handleUpdate}
                    disabled={!newPassword || !confirmPassword}
                />
            </ScrollView>
        </Screen>
    )
}

export default ChangePassword

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flex: 1,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    marginBottom: spacing.lg,
})
