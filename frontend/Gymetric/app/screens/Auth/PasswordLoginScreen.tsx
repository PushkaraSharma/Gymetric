import React, { useState } from "react"
import { View, Pressable, ActivityIndicator, TouchableOpacity, StyleSheet, Text, ScrollView } from "react-native"
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
import { EyeOff, ChevronLeft } from "lucide-react-native"
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { VersionFooter } from "@/components/VersionFooter"

export const PasswordLoginScreen = () => {
    const { theme } = useAppTheme()
    const styles = getStyles(theme)
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const dispatch = useAppDispatch()

    const initialPhone = route.params?.phoneNumber || ""
    const username = route.params?.username || ""

    const [phoneNumber, setPhoneNumber] = useState(initialPhone)
    const [password, setPassword] = useState("")
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isOtpLoading, setIsOtpLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLoginWithOtp = async () => {
        if (!phoneNumber) return;
        setIsOtpLoading(true);
        try {
            const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
            const confirmation = await signInWithPhoneNumber(getAuth(), formattedNumber);
            navigation.navigate("OTPVerification", { confirmation, phoneNumber: formattedNumber });
        } catch (e: any) {
            console.error(e);
            setError("Failed to send OTP")
        } finally {
            setIsOtpLoading(false);
        }
    }

    const handleLogin = async () => {
        if (!phoneNumber || !password) {
            setError("Please enter phone number and password")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

            const response = await api.passwordLogin(formattedNumber, password)
            if (response.kind === 'ok') {
                saveString("authToken", response.data.token);
                api.setAuthToken(response.data.token);
                save("userData", response.data);
                dispatch(setLoggedInUser(response.data));
                trackEvent(AnalyticsEvents.SIGN_IN)
                setAnalyticsUser({ id: response.data?.userId ?? formattedNumber, username: response.data?.username ?? '' })
                setCrashlyticsUser(response.data?.userId ?? null)
            } else {
                setError("Invalid credentials")
            }

        } catch (e: any) {
            console.error(e);
            setError("Login failed. Please check your connection.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color={theme.colors.text} size={32} />
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Welcome Back{username ? `, ${username}` : ''}!</Text>
                <Text style={styles.subtitle}>Login to continue managing your gym.</Text>
                <View style={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <TextField
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        label="Phone Number"
                        placeholder="9999999999"
                        keyboardType="phone-pad"
                        containerStyle={{ marginBottom: theme.spacing.md }}
                        LeftAccessory={() => <Text style={{ paddingLeft: 12, color: theme.colors.textDim }}>+91</Text>}
                    />
                </View>

                <TextField
                    value={password}
                    onChangeText={setPassword}
                    label="Password"
                    placeholder="Enter your password"
                    secureTextEntry={!isPasswordVisible}
                    containerStyle={{ marginBottom: theme.spacing.lg }}
                    RightAccessory={() => (
                        <Pressable style={{ paddingRight: 12 }} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            <EyeOff
                                size={20}
                                color={theme.colors.textDim}
                                style={{ opacity: isPasswordVisible ? 0.5 : 1 }}
                            />
                        </Pressable>
                    )}
                    onSubmitEditing={handleLogin}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                    title={isLoading ? "Logging in..." : "Login"}
                    variant="primary"
                    onPress={handleLogin}
                    disabled={isLoading || isOtpLoading}
                    style={{ marginBottom: theme.spacing.md }}
                    icon={isLoading ? <ActivityIndicator size="small" color="white" /> : undefined}
                />

                {isOtpLoading ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 5 }} /> : <Button
                    title="Login with OTP"
                    variant="ghost"
                    onPress={handleLoginWithOtp}
                    textStyle={{ color: theme.colors.primary, fontSize: 14 }}
                />}
                <VersionFooter />
            </ScrollView>
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        justifyContent: 'center',
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
});
