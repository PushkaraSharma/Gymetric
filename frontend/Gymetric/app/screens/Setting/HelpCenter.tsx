import { Platform, View, ViewStyle, TextStyle, Linking, TouchableOpacity } from 'react-native'
import React, { useRef, useState } from 'react'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { Header } from '@/components/Header'
import { Mail, Phone, ChevronRight } from 'lucide-react-native'
import { $styles } from '@/theme/styles'
import { ThemedStyle } from '@/theme/types'
import { goBack, navigate } from '@/navigators/navigationUtilities'

const HelpCenter = () => {
    const { theme: { colors, spacing, typography }, themed } = useAppTheme()
    const tapCount = useRef(0)
    const [tapHint, setTapHint] = useState(false)

    const handleTitlePress = () => {
        tapCount.current += 1
        if (tapCount.current >= 5) {
            tapCount.current = 0
            navigate('Seed Data')
        } else if (tapCount.current >= 3) {
            setTapHint(true)
        }
    }

    const handleEmail = () => {
        Linking.openURL('mailto:indierootsapps@gmail.com')
    }

    const handlePhone = () => {
        Linking.openURL('tel:+919354454113')
    }

    const SupportItem = ({ icon, title, value, onPress }: any) => (
        <TouchableOpacity style={themed($item)} onPress={onPress} activeOpacity={0.7}>
            <View style={$itemLeft}>
                <View style={themed($iconContainer)}>
                    {icon}
                </View>
                <View>
                    <Text size="xs" style={{ color: colors.textDim }}>{title}</Text>
                    <Text weight="semiBold" style={{ color: colors.text }}>{value}</Text>
                </View>
            </View>
            <ChevronRight size={20} color={colors.textDim} />
        </TouchableOpacity>
    )

    return (
        <Screen
            preset="fixed"
            safeAreaEdges={[]}
        >
            <Header title="Help Center" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />

            <View style={$container}>
                <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.8}>
                    <Text preset="heading" style={$title}>Get in Touch</Text>
                </TouchableOpacity>
                {tapHint && (
                    <Text size="xxs" style={{ color: colors.textDim, marginBottom: 8 }}>Developer access unlocking...</Text>
                )}
                <Text style={themed($subtitle)}>We're here to help you with any questions or issues regarding GymKarta.</Text>

                <View style={$list}>
                    <SupportItem
                        icon={<Mail size={22} color={colors.primary} />}
                        title="Email Support"
                        value="indierootsapps@gmail.com"
                        onPress={handleEmail}
                    />
                    <SupportItem
                        icon={<Phone size={22} color={colors.primary} />}
                        title="Call Us"
                        value="+91 9354454113"
                        onPress={handlePhone}
                    />
                </View>
            </View>
        </Screen>
    )
}

export default HelpCenter

const $container: ViewStyle = {
    padding: 24,
}

const $title: TextStyle = {
    marginBottom: 8,
}

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
    color: colors.textDim,
    fontSize: 16,
    marginBottom: 32,
})

const $list: ViewStyle = {
    gap: 16,
}

const $item: ThemedStyle<ViewStyle> = ({ colors }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
})

const $itemLeft: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
}

const $iconContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
})
