
import React, { useState, useEffect } from "react"
import { View, ViewStyle, TextStyle, ActivityIndicator } from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { ThemedStyle } from "@/theme/types"
import { useNavigation, useRoute } from "@react-navigation/native"
import { api } from "@/services/Api"
import { useAppDispatch } from "@/redux/Hooks"
import { setLoggedInUser } from "@/redux/state/GymStates"
import { saveString, save } from "@/utils/LocalStorage"

export const OTPVerificationScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const dispatch = useAppDispatch()
    const { confirmation, phoneNumber } = route.params || {}

    const [code, setCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleVerify = async () => {
        if (!code || code.length < 6) {
            setError("Please enter a valid 6-digit code")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            // 1. Confirm OTP with Firebase
            const result = await confirmation.confirm(code);
            const user = result.user;
            const idToken = await user.getIdToken();

            // 2. Verify with Backend
            const response = await api.verifyOtp(idToken);

            if (response.kind === 'ok') {
                if (response.data.isNewUser) {
                    // Navigate to Onboarding
                    navigation.navigate("GymOnboarding", { idToken, phoneNumber });
                } else {
                    // Log in directly
                    const { token, ...data } = response.data;
                    saveString("authToken", token);
                    save("userData", data);
                    api.setAuthToken(token);
                    dispatch(setLoggedInUser(data));
                    // Navigation will handle the rest via AppNavigator state change
                }
            } else {
                setError(response.message || "Verification failed.")
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Invalid code. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Screen
            preset="scroll"
            contentContainerStyle={themed($screenContentContainer)}
            safeAreaEdges={["top", "bottom"]}
            backgroundColor={colors.background}
        >
            <View style={themed($container)}>
                <Text preset="heading" text="Enter Code" style={themed($title)} />
                <Text preset="subheading" text={`We sent it to ${phoneNumber}`} style={{ color: colors.textDim, marginBottom: spacing.xl }} />

                <TextField
                    value={code}
                    onChangeText={setCode}
                    label="Verification Code"
                    placeholder="123456"
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={6}
                    containerStyle={{ marginBottom: spacing.lg }}
                />

                {error ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

                <Button
                    text={isLoading ? "Verifying..." : "Verify"}
                    preset="reversed"
                    onPress={handleVerify}
                    disabled={isLoading}
                    style={{ marginTop: spacing.md }}
                    RightAccessory={isLoading ? () => <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} /> : undefined}
                />
            </View>
        </Screen>
    )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
})

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flex: 1,
    justifyContent: 'center',
})

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
    marginBottom: spacing.xs,
})
