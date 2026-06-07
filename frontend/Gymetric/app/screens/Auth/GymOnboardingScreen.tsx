import React, { useState, useRef } from "react"
import { View, ActivityIndicator, StyleSheet, Text, ScrollView, Platform, Pressable, TextInput } from "react-native"
import { Screen } from "@/components/Screen"
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
import { EyeOff } from "lucide-react-native"

export const GymOnboardingScreen = () => {
    const { theme } = useAppTheme()
    const styles = getStyles(theme)
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const dispatch = useAppDispatch()
    const { idToken, phoneNumber } = route.params || {}

    const [gymName, setGymName] = useState("")
    const [ownerName, setOwnerName] = useState("")
    const [gymAddress, setGymAddress] = useState("")
    const [password, setPassword] = useState("")
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const ownerRef = useRef<TextInput>(null)
    const addressRef = useRef<TextInput>(null)
    const passwordRef = useRef<TextInput>(null)

    const handleOnboard = async () => {
        if (!gymName || !ownerName || !password) {
            setError("Please fill in all required fields")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const payload = {
                firebaseIdToken: idToken,
                gymName,
                ownerName,
                gymAddress,
                password
            }

            const response = await api.onboard(payload)

            if (response.kind === 'ok') {
                const token = response.data.token;
                saveString("authToken", token);
                save("userData", response.data);
                api.setAuthToken(token);
                dispatch(setLoggedInUser(response.data));
                trackEvent(AnalyticsEvents.SIGN_IN)
                setAnalyticsUser({ id: response.data?.userId ?? phoneNumber, username: response.data?.username ?? ownerName })
                setCrashlyticsUser(response.data?.userId ?? null)
            } else {
                setError("Onboarding failed")
            }

        } catch (e: any) {
            console.error(e);
            setError("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Screen
            preset="fixed"
            safeAreaEdges={["top", "bottom"]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Setup your Gym</Text>
                <Text style={styles.subtitle}>Just a few more details to get you started.</Text>

                <TextField
                    value={gymName}
                    onChangeText={setGymName}
                    label="Gym Name"
                    placeholder="e.g. Spartan Fitness"
                    containerStyle={{ marginBottom: theme.spacing.md }}
                    returnKeyType="next"
                    onSubmitEditing={() => ownerRef.current?.focus()}
                />

                <TextField
                    ref={ownerRef}
                    value={ownerName}
                    onChangeText={setOwnerName}
                    label="Your Name"
                    placeholder="John Doe"
                    containerStyle={{ marginBottom: theme.spacing.md }}
                    returnKeyType="next"
                    onSubmitEditing={() => addressRef.current?.focus()}
                />

                <TextField
                    ref={addressRef}
                    value={gymAddress}
                    onChangeText={setGymAddress}
                    label="Gym Address (Optional)"
                    placeholder="123 Fitness St."
                    containerStyle={{ marginBottom: theme.spacing.md }}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                />

                <TextField
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    label="Create Password"
                    placeholder="Min 6 characters"
                    secureTextEntry={!isPasswordVisible}
                    containerStyle={{ marginBottom: theme.spacing.lg }}
                    returnKeyType="done"
                    onSubmitEditing={handleOnboard}
                    RightAccessory={() => (
                        <Pressable style={{ paddingRight: 12 }} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            <EyeOff
                                size={20}
                                color={theme.colors.textDim}
                                style={{ opacity: isPasswordVisible ? 0.5 : 1 }}
                            />
                        </Pressable>
                    )}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                    title={isLoading ? "Setting up..." : "Complete Setup"}
                    variant="primary"
                    onPress={handleOnboard}
                    disabled={isLoading}
                    style={{ marginTop: theme.spacing.md }}
                    icon={isLoading ? <ActivityIndicator size="small" color="white" /> : undefined}
                />
            </ScrollView>
        </Screen>
    )
}

const getStyles = (theme: any) => StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.xl,
        paddingBottom: 40,
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
