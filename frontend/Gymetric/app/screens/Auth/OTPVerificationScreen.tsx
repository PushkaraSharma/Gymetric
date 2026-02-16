
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
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useRef } from "react"

export const OTPVerificationScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const dispatch = useAppDispatch()
    const { confirmation, phoneNumber } = route.params || {}

    const [code, setCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    // Resend OTP State
    const [confirmResult, setConfirmResult] = useState(confirmation)
    const [timer, setTimer] = useState(30)
    const [canResend, setCanResend] = useState(false)
    const isVerifying = useRef(false)

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        } else {
            setCanResend(true)
        }
        return () => clearInterval(interval)
    }, [timer])

    const handleResendOtp = async () => {
        if (!canResend) return

        setError("")
        try {
            const newConfirmation = await signInWithPhoneNumber(getAuth(), phoneNumber)
            setConfirmResult(newConfirmation)
            setTimer(30)
            setCanResend(false)
        } catch (e: any) {
            console.error("Resend error", e)
            setError("Failed to resend OTP. Try again later.")
        }
    }

    const handleVerify = async (otpCode?: string) => {
        const codeToVerify = otpCode || code
        if (!codeToVerify || codeToVerify.length < 6) {
            setError("Please enter a valid 6-digit code")
            return
        }

        // Prevent double submission
        if (isVerifying.current) return
        isVerifying.current = true

        setIsLoading(true)
        setError("")

        try {
            // 1. Confirm OTP with Firebase
            const result = await confirmResult.confirm(codeToVerify);
            const user = result.user;
            const idToken = await user.getIdToken();

            // 2. Verify with Backend
            const response = await api.verifyOtp(idToken);

            if (response.kind === 'ok') {
                if (response.data.isNewUser) {
                    navigation.navigate("GymOnboarding", { idToken, phoneNumber });
                } else {
                    const { token, ...data } = response.data;
                    saveString("authToken", token);
                    save("userData", data);
                    api.setAuthToken(token);
                    dispatch(setLoggedInUser(data));
                }
            } else {
                setError("Verification failed.")
            }

        } catch (e: any) {
            console.error(e);
            setError("Invalid code. Please try again.")
        } finally {
            setIsLoading(false)
            isVerifying.current = false
        }
    }

    // Auto-submit when 6 digits are entered (works with SMS autofill too)
    const handleCodeChange = (text: string) => {
        setCode(text)
        if (text.length === 6) {
            handleVerify(text)
        }
    }

    return (
        <Screen
            preset="fixed"
            contentContainerStyle={themed($screenContentContainer)}
            safeAreaEdges={["top", "bottom"]}
            backgroundColor={colors.background}
        >
            <View style={themed($container)}>
                <Text preset="heading" text="Enter Code" style={themed($title)} />
                <Text preset="subheading" text={`We sent it to ${phoneNumber}`} style={{ color: colors.textDim, marginBottom: spacing.xl }} />

                <TextField
                    value={code}
                    onChangeText={handleCodeChange}
                    label="Verification Code"
                    placeholder="123456"
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={6}
                    autoComplete="sms-otp"
                    textContentType="oneTimeCode"
                    containerStyle={{ marginBottom: spacing.lg }}
                />

                {error ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

                <Button
                    text={isLoading ? "Verifying..." : "Verify"}
                    preset="reversed"
                    onPress={() => handleVerify()}
                    disabled={isLoading}
                    style={{ marginTop: spacing.md }}
                    RightAccessory={isLoading ? () => <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} /> : undefined}
                />

                <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
                    {canResend ? (
                        <Text
                            text="Resend Code"
                            style={{ color: colors.primary, textDecorationLine: 'underline' }}
                            onPress={handleResendOtp}
                        />
                    ) : (
                        <Text
                            text={`Resend code in ${timer}s`}
                            style={{ color: colors.textDim }}
                        />
                    )}
                </View>
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
