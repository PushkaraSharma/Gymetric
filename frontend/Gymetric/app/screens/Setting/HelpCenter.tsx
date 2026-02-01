import { Platform, View, ViewStyle, TextStyle, Linking, TouchableOpacity } from 'react-native'
import React from 'react'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { Header } from '@/components/Header'
import HeaderbackButton from '@/components/HeaderbackButton'
import { Mail, Phone, ChevronRight } from 'lucide-react-native'
import { $styles } from '@/theme/styles'
import { ThemedStyle } from '@/theme/types'

const HelpCenter = () => {
    const { theme: { colors, spacing, typography }, themed } = useAppTheme()

    const handleEmail = () => {
        Linking.openURL('mailto:pushkarasharma11@gmail.com')
    }

    const handlePhone = () => {
        Linking.openURL('tel:+919711583364')
    }

    const SupportItem = ({ icon, title, value, onPress }: any) => (
        <TouchableOpacity style={themed($item)} onPress={onPress} activeOpacity={0.7}>
            <View style={$itemLeft}>
                <View style={themed($iconContainer)}>
                    {icon}
                </View>
                <View>
                    <Text size="xs" style={themed({ color: colors.textDim })}>{title}</Text>
                    <Text weight="semiBold" style={themed({ color: colors.text })}>{value}</Text>
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
            <Header title="Help Center" LeftActionComponent={<HeaderbackButton />} backgroundColor={colors.surface} />

            <View style={themed($container)}>
                <Text preset="heading" style={themed($title)}>Get in Touch</Text>
                <Text style={themed($subtitle)}>We're here to help you with any questions or issues regarding Gymetric.</Text>

                <View style={$list}>
                    <SupportItem
                        icon={<Mail size={22} color={colors.primary} />}
                        title="Email Support"
                        value="support@gymetric.com"
                        onPress={handleEmail}
                    />
                    <SupportItem
                        icon={<Phone size={22} color={colors.primary} />}
                        title="Call Us"
                        value="+91 98765 43210"
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
