import React, { useEffect, useState } from "react"
import { View, TextStyle, ViewStyle, Keyboard, Platform } from "react-native"
import * as Application from "expo-application"
import { Text } from "./Text"
import { useAppTheme } from "@/theme/context"
import { OTA_VERSION } from "@/utils/Constants"
import { ThemedStyle } from "@/theme/types"

export const VersionFooter = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const [isKeyboardVisible, setKeyboardVisible] = useState(false)

    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

        const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
        const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))

        return () => {
            showSubscription.remove()
            hideSubscription.remove()
        }
    }, [])

    const nativeVersion = Application.nativeApplicationVersion || "1.0.0"

    if (isKeyboardVisible) return null

    return (
        <View style={themed($container)}>
            <Text
                style={themed($text)}
                text={`v${nativeVersion} (${OTA_VERSION})`}
            />
        </View>
    )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    position: "absolute",
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
    pointerEvents: "none", // Allow clicks to pass through if needed, though likely not for footer text
})

const $text: ThemedStyle<TextStyle> = ({ colors }) => ({
    fontSize: 10,
    color: colors.textDim,
})
