import React from "react"
import { View, TextStyle, ViewStyle } from "react-native"
import * as Application from "expo-application"
import { Text } from "./Text"
import { useAppTheme } from "@/theme/context"
import { OTA_VERSION } from "@/utils/Constants"
import { ThemedStyle } from "@/theme/types"

export const VersionFooter = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()

    const nativeVersion = Application.nativeApplicationVersion || "1.0.0"

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
