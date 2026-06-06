import React, { useState } from "react"
import { View, ActivityIndicator, StyleSheet, Text, ScrollView } from "react-native"
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
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Setup your Gym</Text>
                <Text style={styles.subtitle}>Just a few more details to get you started.</Text>

                <TextField
                    value={gymName}
                    onChangeText={setGymName}
                    label="Gym Name"
                    placeholder="e.g. Spartan Fitness"
                    containerStyle={{ marginBottom: theme.spacing.md }}
                />

                <TextField
                    value={ownerName}
                    onChangeText={setOwnerName}
                    label="Your Name"
                    placeholder="John Doe"
                    containerStyle={{ marginBottom: theme.spacing.md }}
                />

                <TextField
                    value={gymAddress}
                    onChangeText={setGymAddress}
                    label="Gym Address (Optional)"
                    placeholder="123 Fitness St."
                    containerStyle={{ marginBottom: theme.spacing.md }}
                />

                <TextField
                    value={password}
                    onChangeText={setPassword}
                    label="Create Password"
                    placeholder="Min 6 characters"
                    secureTextEntry={!isPasswordVisible}
                    containerStyle={{ marginBottom: theme.spacing.lg }}
                    RightAccessory={() => (
                        <View style={{ paddingRight: 12 }}>
                            <EyeOff
                                size={20}
                                color={theme.colors.textDim}
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                style={{ opacity: isPasswordVisible ? 0.5 : 1 }}
                            />
                        </View>
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
        </SafeAreaView>
    )
}

const getStyles = (theme: any) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.xl,
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
