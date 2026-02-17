
import React, { useState } from "react"
import { View, ViewStyle, TextStyle, ActivityIndicator } from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { ThemedStyle } from "@/theme/types"
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useNavigation } from "@react-navigation/native"

import { api } from "@/services/Api"

export const PhoneLoginScreen = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const navigation = useNavigation<any>()
    const [phoneNumber, setPhoneNumber] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleContinue = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            setError("Please enter a valid phone number")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            // Format number to E.164 (Assuming India +91 for now, can be made dynamic)
            const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
            // Check if user exists & has password
            const check = await api.checkUser(formattedNumber);
            if (check.kind === 'ok' && check.data.exists && check.data.hasPassword) {
                // User has password -> Go to Password Login
                navigation.navigate("PasswordLogin", {
                    phoneNumber,
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
                <Text preset="heading" text="What's your number?" style={themed($title)} />
                <Text preset="subheading" text="We'll check if you have an account." style={{ color: colors.textDim, marginBottom: spacing.xl }} />
                <TextField
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
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
                    onPress={handleContinue}
                    disabled={isLoading}
                    style={{ marginTop: spacing.md }}
                    RightAccessory={isLoading ? () => <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} /> : undefined}
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
