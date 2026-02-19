
import React, { useState, useEffect } from "react"
import { View, ViewStyle, TextStyle, ActivityIndicator, Image } from "react-native"
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
import { VersionFooter } from "@/components/VersionFooter"
import { ChevronLeft } from "lucide-react-native"
import { TouchableOpacity, Keyboard } from "react-native"

export const OTPVerificationScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const dispatch = useAppDispatch()
    const { confirmation, phoneNumber } = route.params || {}

    const [code, setCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [otpSending, setOtpSending] = useState(false)

    // Resend OTP State
    const [confirmResult, setConfirmResult] = useState(confirmation)
    const [timer, setTimer] = useState(30)
    const [canResend, setCanResend] = useState(false)
    const isVerifying = useRef(false)
    const isFinalizing = useRef(false)

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

    // Handle Auto-Verification & Auth State Changes
    useEffect(() => {
        const unsubscribe = getAuth().onAuthStateChanged((user) => {
            if (user) {
                // Determine if we need to verify this user with backend
                // This covers: Auto-verification OR Manual verification state change
                finalizeLogin(user)
            }
        })
        return unsubscribe
    }, [])

    const handleResendOtp = async () => {
        if (!canResend) return
        setOtpSending(true)
        setError("")
        try {
            const newConfirmation = await signInWithPhoneNumber(getAuth(), phoneNumber)
            setConfirmResult(newConfirmation)
            setTimer(30)
            setCanResend(false)
        } catch (e: any) {
            console.error("Resend error", e)
            setError(e.message || "Failed to resend OTP. Try again later.")
        } finally {
            setOtpSending(false)
        }
    }

    const finalizeLogin = async (user: any) => {
        if (isFinalizing.current) return
        isFinalizing.current = true
        setIsLoading(true)
        setError("")

        try {
            const idToken = await user.getIdToken()

            // 2. Verify with Backend
            const response = await api.verifyOtp(idToken)

            if (response.kind === 'ok') {
                if (response.data.isNewUser) {
                    navigation.navigate("GymOnboarding", { idToken, phoneNumber })
                } else {
                    const { token, ...data } = response.data
                    saveString("authToken", token)
                    save("userData", data)
                    api.setAuthToken(token)
                    dispatch(setLoggedInUser(data))
                }
            } else {
                setError("Verification failed.")
                // Allow retrying if backend verification failed
                isFinalizing.current = false
            }
        } catch (e: any) {
            console.error("Backend Verification Error", e)
            setError("Error verifying with server.")
            isFinalizing.current = false
        } finally {
            setIsLoading(false)
            // Note: We don't reset isFinalizing.current to false on success 
            // because we don't want to re-process the same user session.
        }
    }

    const handleVerify = async (otpCode?: string) => {
        const codeToVerify = otpCode || code
        if (!codeToVerify || codeToVerify.length < 6) {
            setError("Please enter a valid 6-digit code")
            return
        }

        // Prevent double submission of the manual verification button
        if (isVerifying.current) return
        isVerifying.current = true
        setIsLoading(true)
        setError("")

        try {
            // 1. Confirm OTP with Firebase
            // If successful, onAuthStateChanged will likely fire and handle finalizeLogin.
            // But we can also call it explicitly to be safe/swift.
            const result = await confirmResult.confirm(codeToVerify)

            // If confirm succeeds, we proceed. finalizeLogin has its own guard.
            if (result && result.user) {
                await finalizeLogin(result.user)
            }

        } catch (e: any) {
            console.error("Manual Verification Error", e)
            let msg = "Invalid code. Please try again."
            if (e.code === 'auth/invalid-verification-code') msg = "Invalid code."
            if (e.code === 'auth/code-expired') msg = "Code expired. Resend code."
            if (e.code === 'auth/session-expired') msg = "Session expired. Try again."
            // If the code was auto-retrieved and used, we might get an error here?
            // Usually if already signed in, confirm might fail or succeed. 
            // If the underlying issue is that it WAS verified, the listener handles it.

            setError(msg)
            isFinalizing.current = false
        } finally {
            setIsLoading(false)
            isVerifying.current = false
        }
    }

    // Auto-submit when 6 digits are entered (works with SMS autofill too)
    const handleCodeChange = (text: string) => {
        setCode(text)
        if (text.length === 6) {
            Keyboard.dismiss()
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
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <ChevronLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <View style={themed($container)}>
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                    <Image source={require("../../../assets/images/app-icon.png")} style={{ width: 80, height: 80, borderRadius: 16 }} />
                </View>
                <Text preset="heading" text="Enter Code" style={themed($title)} />
                <Text size="md" text={`We sent it to ${phoneNumber}`} style={{ color: colors.textDim, marginBottom: spacing.xl }} />

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
                    disabled={isLoading || otpSending}
                    style={{ marginTop: spacing.md }}
                    RightAccessory={isLoading ? () => <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} /> : undefined}
                />

                <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
                    {
                        otpSending ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 5 }} />
                        ) : canResend ? (
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
                <VersionFooter />
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
