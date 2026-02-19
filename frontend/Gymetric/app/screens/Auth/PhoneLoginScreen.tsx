
import React, { useState } from "react"
import { View, ViewStyle, TextStyle, ActivityIndicator, Image } from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { ThemedStyle } from "@/theme/types"
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useNavigation } from "@react-navigation/native"

import { api } from "@/services/Api"
import { storage } from "@/utils/LocalStorage"
import { VersionFooter } from "@/components/VersionFooter";
import { Keyboard } from "react-native";

export const PhoneLoginScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const navigation = useNavigation<any>()
    const [phoneNumber, setPhoneNumber] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    // Ensure we start with a clean state
    React.useEffect(() => {
        const auth = getAuth();
        if (auth.currentUser) {
            auth.signOut().catch(console.error);
        }
    }, []);

    const handleContinue = async (phone?: string) => {
        const phoneInput = phone || phoneNumber
        const phoneToUse = phoneInput.replace(/\s/g, '') // Sanitize input

        if (!phoneToUse || phoneToUse.length < 10) {
            setError("Please enter a valid phone number")
            return
        }

        setIsLoading(true)
        setError("")
        storage.set("isFirstLaunch", false)

        try {
            // Format number to E.164 (Assuming India +91 for now, can be made dynamic)
            const formattedNumber = phoneToUse.startsWith('+') ? phoneToUse : `+91${phoneToUse}`;
            // Check if user exists & has password
            const check = await api.checkUser(formattedNumber);
            if (check.kind === 'ok' && check.data.exists && check.data.hasPassword) {
                // User has password -> Go to Password Login
                navigation.navigate("PasswordLogin", {
                    phoneNumber: phoneToUse,
                    username: check.data.username
                });
            } else {
                const confirmation = await signInWithPhoneNumber(getAuth(), formattedNumber);
                navigation.navigate("OTPVerification", { confirmation, phoneNumber: formattedNumber });
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
            contentContainerStyle={themed($screenContentContainer)}
            safeAreaEdges={["top", "bottom"]}
            backgroundColor={colors.background}
        >
            <View style={themed($container)}>
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                    <Image source={require("../../../assets/images/app-icon.png")} style={{ width: 80, height: 80, borderRadius: 16 }} />
                </View>
                <Text preset="heading" text={storage.getBoolean("isFirstLaunch") ? "Let's Get Started!" : "What's your number?"} style={[themed($title)]} />
                <Text size="md" text={storage.getBoolean("isFirstLaunch") ? "Enter your phone number to continue." : "We'll check if you have an account."} style={{ color: colors.textDim, marginBottom: spacing.xl }} />
                <TextField
                    value={phoneNumber}
                    onChangeText={(text) => {
                        setPhoneNumber(text)
                        if (text.length === 10) {
                            Keyboard.dismiss()
                            // Small delay to allow state update to propagate
                            setTimeout(() => handleContinue(text), 100)
                        }
                    }}
                    label="Phone Number"
                    placeholder="9999999999"
                    placeholderTextColor={colors.palette.slate300}
                    keyboardType="phone-pad"
                    autoFocus
                    containerStyle={{ marginBottom: spacing.lg }}
                    LeftAccessory={() => <Text style={{ paddingLeft: 12, color: colors.textDim }}>+91</Text>}
                />

                {error ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

                <Button
                    text={isLoading ? "Please wait..." : "Continue"}
                    preset="reversed"
                    onPress={() => handleContinue()}
                    disabled={isLoading}
                    style={{ marginTop: spacing.md }}
                    RightAccessory={isLoading ? () => <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} /> : undefined}
                />
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
