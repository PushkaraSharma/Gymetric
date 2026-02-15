
import React, { useState } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
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
import { Eye, EyeOff } from "lucide-react-native"

export const GymOnboardingScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
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
                const { token, data } = response.data; // adjust based on API structure
                saveString("authToken", token);
                save("userData", data);
                api.setAuthToken(token);
                dispatch(setLoggedInUser(data));
            } else {
                setError(response.message || "Onboarding failed")
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Something went wrong. Please try again.")
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
                <Text preset="heading" text="Setup your Gym" style={themed($title)} />
                <Text preset="subheading" text="Just a few more details to get you started." style={{ color: colors.textDim, marginBottom: spacing.xl }} />

                <TextField
                    value={gymName}
                    onChangeText={setGymName}
                    label="Gym Name"
                    placeholder="e.g. Spartan Fitness"
                    containerStyle={{ marginBottom: spacing.md }}
                />

                <TextField
                    value={ownerName}
                    onChangeText={setOwnerName}
                    label="Your Name"
                    placeholder="John Doe"
                    containerStyle={{ marginBottom: spacing.md }}
                />

                <TextField
                    value={gymAddress}
                    onChangeText={setGymAddress}
                    label="Gym Address (Optional)"
                    placeholder="123 Fitness St."
                    containerStyle={{ marginBottom: spacing.md }}
                />

                <TextField
                    value={password}
                    onChangeText={setPassword}
                    label="Create Password"
                    placeholder="Min 6 characters"
                    secureTextEntry={!isPasswordVisible}
                    containerStyle={{ marginBottom: spacing.lg }}
                    RightAccessory={() => (
                        <View style={{ paddingRight: 12, paddingTop: 12 }}>
                            <EyeOff
                                size={20}
                                color={colors.textDim}
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                style={{ opacity: isPasswordVisible ? 0.5 : 1 }}
                            />
                        </View>
                    )}
                />

                {error ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

                <Button
                    text="Complete Setup"
                    preset="reversed"
                    onPress={handleOnboard}
                    disabled={isLoading}
                    style={{ marginTop: spacing.md }}
                />
            </View>
        </Screen>
    )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
})

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flex: 1,
    justifyContent: 'center',
})

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
    marginBottom: spacing.xs,
})
