
import React, { useState } from "react"
import { View, ViewStyle, TextStyle, Pressable, ActivityIndicator } from "react-native"
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
import { EyeOff, ChevronLeft } from "lucide-react-native"
import { TouchableOpacity } from "react-native"
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { VersionFooter } from "@/components/VersionFooter"

export const PasswordLoginScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
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
            // Ensure E.164 format if needed, but backend expects whatever format we store
            // Assuming user enters raw number or +91... let's stick to raw input for now unless we enforce formatting
            const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

            const response = await api.passwordLogin(formattedNumber, password)
            if (response.kind === 'ok') {
                saveString("authToken", response.data.token);
                api.setAuthToken(response.data.token);
                save("userData", response.data);
                dispatch(setLoggedInUser(response.data));
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
        <Screen
            preset="scroll"
            contentContainerStyle={themed($screenContentContainer)}
            safeAreaEdges={["top", "bottom"]}
            backgroundColor={colors.background}
        >
            <TouchableOpacity onPress={() => navigation.goBack()} style={{}}>
                <ChevronLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <View style={themed($container)}>
                <Text preset="heading" text={`Welcome Back${username ? `, ${username}` : ''}!`} style={themed($title)} />
                <Text size="md" text="Login to continue managing your gym." style={{ color: colors.textDim, marginBottom: spacing.xl }} />
                <View style={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <TextField
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        label="Phone Number"
                        placeholder="9999999999"
                        keyboardType="phone-pad"
                        containerStyle={{ marginBottom: spacing.md }}
                        LeftAccessory={() => <Text style={{ paddingLeft: 12, color: colors.textDim }}>+91</Text>}
                    />
                </View>

                <TextField
                    value={password}
                    onChangeText={setPassword}
                    label="Password"
                    placeholder="Enter your password"
                    secureTextEntry={!isPasswordVisible}
                    containerStyle={{ marginBottom: spacing.lg }}
                    RightAccessory={() => (
                        <Pressable style={{ paddingRight: 12 }} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            <EyeOff
                                size={20}
                                color={colors.textDim}
                                style={{ opacity: isPasswordVisible ? 0.5 : 1 }}
                            />
                        </Pressable>
                    )}
                    onSubmitEditing={handleLogin}
                />

                {error ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

                <Button
                    text={isLoading ? "Logging in..." : "Login"}
                    preset="reversed"
                    onPress={handleLogin}
                    disabled={isLoading || isOtpLoading}
                    style={{ marginBottom: spacing.md }}
                    RightAccessory={isLoading ? () => <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} /> : undefined}
                />

                {isOtpLoading ? <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 5 }} /> : <Button
                    text="Forgot Password? / Login with OTP"
                    preset="default"
                    onPress={handleLoginWithOtp}
                    style={{ backgroundColor: 'transparent', borderWidth: 0 }}
                    textStyle={{ color: colors.primary, fontSize: 14 }}
                />}
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
