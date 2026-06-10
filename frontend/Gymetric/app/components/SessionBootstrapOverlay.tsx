import React, { useEffect, useRef, useState } from 'react'
import { View, Image, ActivityIndicator, ViewStyle, TextStyle, ImageStyle } from 'react-native'
import { useAppSelector } from '@/redux/Hooks'
import { selectBootstrapping } from '@/redux/state/GymStates'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { spacing } from '@/theme/spacing'

const SHOW_DELAY_MS = 800
const MIN_VISIBLE_MS = 300

export const SessionBootstrapOverlay = () => {
    const bootstrapping = useAppSelector(selectBootstrapping)
    const bootstrappingRef = useRef(bootstrapping)
    bootstrappingRef.current = bootstrapping

    const { themed, theme: { colors }, isDark } = useAppTheme()
    const [visible, setVisible] = useState(false)
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const shownAtRef = useRef<number | null>(null)

    useEffect(() => {
        if (bootstrapping) {
            showTimerRef.current = setTimeout(() => {
                if (bootstrappingRef.current) {
                    shownAtRef.current = Date.now()
                    setVisible(true)
                }
            }, SHOW_DELAY_MS)
        } else {
            if (showTimerRef.current) {
                clearTimeout(showTimerRef.current)
                showTimerRef.current = null
            }

            if (shownAtRef.current) {
                const elapsed = Date.now() - shownAtRef.current
                const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
                hideTimerRef.current = setTimeout(() => {
                    setVisible(false)
                    shownAtRef.current = null
                }, remaining)
            } else {
                setVisible(false)
            }
        }

        return () => {
            if (showTimerRef.current) clearTimeout(showTimerRef.current)
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        }
    }, [bootstrapping])

    if (!visible) return null

    return (
        <View style={themed($overlay)}>
            <Image
                source={isDark ? require('../../assets/images/app-icon-dark.png') : require('../../assets/images/app-icon.png')}
                style={$logo}
                resizeMode="contain"
            />
            <Text weight="semiBold" style={themed($message)}>Getting things ready...</Text>
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        </View>
    )
}

const $overlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
})

const $logo: ImageStyle = {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: spacing.lg,
}

const $message: ThemedStyle<TextStyle> = ({ colors }) => ({
    color: colors.textDim,
    fontSize: 16,
})
