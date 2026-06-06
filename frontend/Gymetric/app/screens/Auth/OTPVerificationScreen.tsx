import React, { useState, useEffect } from "react"
import { View, ActivityIndicator, Image, TouchableOpacity, Keyboard, StyleSheet, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { TextField } from "@/components/TextField"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { useNavigation, useRoute } from "@react-navigation/native"
import { api } from "@/services/Api"
import { useAppDispatch } from "@/redux/Hooks"
import { setLoggedInUser } from "@/redux/state/GymStates"
import { saveString, save } from "@/utils/LocalStorage"
import { trackEvent, AnalyticsEvents, setAnalyticsUser } from '@/services/analyticsService'
import { setCrashlyticsUser } from '@/services/crashlyticsService'
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useRef } from "react"
import { VersionFooter } from "@/components/VersionFooter"
import { ChevronLeft } from "lucide-react-native"

export const OTPVerificationScreen = () => {
    const { theme, isDark } = useAppTheme()
    const styles = getStyles(theme)
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
            const response = await api.verifyOtp(idToken)

            if (response.kind === 'ok') {
                if (response.data.isNewUser) {
                    navigation.navigate("GymOnboarding", { idToken, phoneNumber })
                } else {
                    const token = response.data.token
                    saveString("authToken", token)
                    save("userData", response.data)
                    api.setAuthToken(token)
                    dispatch(setLoggedInUser(response.data))
                    trackEvent(AnalyticsEvents.SIGN_IN)
                    setAnalyticsUser({ id: response.data?.userId ?? response.data?.phoneNumber, username: response.data?.username ?? '' })
                    setCrashlyticsUser(response.data?.userId ?? null)
                }
            } else {
                setError("Verification failed.")
                isFinalizing.current = false
            }
        } catch (e: any) {
            console.error("Backend Verification Error", e)
            setError("Error verifying with server.")
            isFinalizing.current = false
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerify = async (otpCode?: string) => {
        const codeToVerify = otpCode || code
        if (!codeToVerify || codeToVerify.length < 6) {
            setError("Please enter a valid 6-digit code")
            return
        }

        if (isVerifying.current) return
        isVerifying.current = true
        setIsLoading(true)
        setError("")

        try {
            const result = await confirmResult.confirm(codeToVerify)
            if (result && result.user) {
                await finalizeLogin(result.user)
            }
        } catch (e: any) {
            console.error("Manual Verification Error", e)
            let msg = "Invalid code. Please try again."
            if (e.code === 'auth/invalid-verification-code') msg = "Invalid code."
            if (e.code === 'auth/code-expired') msg = "Code expired. Resend code."
            if (e.code === 'auth/session-expired') msg = "Session expired. Try again."
            setError(msg)
            isFinalizing.current = false
        } finally {
            setIsLoading(false)
            isVerifying.current = false
        }
    }

    const handleCodeChange = (text: string) => {
        setCode(text)
        if (text.length === 6) {
            Keyboard.dismiss()
            handleVerify(text)
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color={theme.colors.text} size={32} />
                </TouchableOpacity>
            </View>
            <View style={styles.container}>
                <View style={styles.logoContainer}>
                    <Image source={isDark ? require("../../../assets/images/app-icon-dark.png") : require("../../../assets/images/app-icon.png")} style={styles.logo} />
                </View>
                <Text style={styles.title}>Enter Code</Text>
                <Text style={styles.subtitle}>We sent it to {phoneNumber}</Text>

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
                    containerStyle={{ marginBottom: theme.spacing.lg }}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                    title={isLoading ? "Verifying..." : "Verify"}
                    variant="primary"
                    onPress={() => handleVerify()}
                    disabled={isLoading || otpSending}
                    style={{ marginTop: theme.spacing.md }}
                    icon={isLoading ? <ActivityIndicator size="small" color="white" /> : undefined}
                />

                <View style={styles.resendContainer}>
                    {otpSending ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 5 }} />
                    ) : canResend ? (
                        <Text
                            style={styles.resendLink}
                            onPress={handleResendOtp}
                        >Resend Code</Text>
                    ) : (
                        <Text style={styles.timerText}>Resend code in {timer}s</Text>
                    )}
                </View>
                <VersionFooter />
            </View>
        </SafeAreaView>
    )
}

const getStyles = (theme: any) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
    },
    backButton: {
        padding: theme.spacing.xs,
        marginLeft: -theme.spacing.xs,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 16,
    },
    title: {
        fontSize: theme.typography.xxl,
        fontWeight: theme.typography.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.typography.m,
        color: theme.colors.textDim,
        marginBottom: theme.spacing.xl,
    },
    errorText: {
        color: theme.colors.error,
        marginBottom: theme.spacing.md,
    },
    resendContainer: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
    },
    resendLink: {
        color: theme.colors.primary,
        textDecorationLine: 'underline',
        fontSize: theme.typography.m,
    },
    timerText: {
        color: theme.colors.textDim,
        fontSize: theme.typography.m,
    },
});
