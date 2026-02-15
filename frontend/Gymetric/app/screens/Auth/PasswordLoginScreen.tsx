
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

export const PasswordLoginScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const dispatch = useAppDispatch()

    // Optional: prepopulate if coming from somewhere that knows the phone (or remembered)
    const initialPhone = route.params?.phoneNumber || ""

    const [phoneNumber, setPhoneNumber] = useState(initialPhone)
    const [password, setPassword] = useState("")
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async () => {
        if (!phoneNumber || !password) {
            setError("Please enter phone number and password")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            // Ensure E.164 format if needed, but backend expects whatever format we store
            // Assuming user enters raw number or +91... let's stick to raw input for now unless we enforce formatting
            const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

            const response = await api.loginPassword(formattedNumber, password)

            if (response.kind === 'ok') {
                const { token, data } = response.data;
                saveString("authToken", token);
                save("userData", data);
                api.setAuthToken(token);
                dispatch(setLoggedInUser(data));
            } else {
                setError(response.message || "Invalid credentials")
            }

        } catch (e: any) {
            console.error(e);
            setError("Login failed. Please check your connection.")
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
                <Text preset="heading" text="Welcome Back!" style={themed($title)} />
                <Text preset="subheading" text="Login to continue managing your gym." style={{ color: colors.textDim, marginBottom: spacing.xl }} />

                <TextField
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    label="Phone Number"
                    placeholder="9999999999"
                    keyboardType="phone-pad"
                    containerStyle={{ marginBottom: spacing.md }}
                    LeftAccessory={() => <Text style={{ paddingLeft: 12, paddingTop: 14, color: colors.textDim }}>+91</Text>}
                />

                <TextField
                    value={password}
                    onChangeText={setPassword}
                    label="Password"
                    placeholder="Enter your password"
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
                    text="Login"
                    preset="reversed"
                    onPress={handleLogin}
                    disabled={isLoading}
                    style={{ marginBottom: spacing.md }}
                />

                <Button
                    text="Forgot Password? / Login with OTP"
                    preset="default"
                    onPress={() => navigation.navigate("PhoneLogin")}
                    style={{ backgroundColor: 'transparent', borderWidth: 0 }}
                    textStyle={{ color: colors.primary, fontSize: 14 }}
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
