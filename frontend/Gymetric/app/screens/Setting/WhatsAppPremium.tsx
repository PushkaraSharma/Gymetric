import React from 'react'
import { View, ScrollView, Image, Linking, ViewStyle, TextStyle } from 'react-native'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { useNavigation } from '@react-navigation/native'
import { MessageCircle, Bell, CheckCircle, Calendar, Zap, ArrowRight } from 'lucide-react-native'
import { $styles } from '@/theme/styles'

const FeatureItem = ({ icon, title, description }: { icon: any, title: string, description: string }) => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    return (
        <View style={themed($featureItem)}>
            <View style={themed($iconContainer)}>
                {icon}
            </View>
            <View style={{ flex: 1 }}>
                <Text preset="bold" style={{ marginBottom: 4 }}>{title}</Text>
                <Text size="xs" style={{ color: colors.textDim }}>{description}</Text>
            </View>
        </View>
    )
}

export const WhatsAppPremium = () => {
    const { themed, theme: { colors, spacing } } = useAppTheme()
    const navigation = useNavigation<any>()

    const features = [
        {
            icon: <Bell size={24} color={colors.primary} />,
            title: "Automated Reminders",
            description: "Send automated payment reminders to clients via WhatsApp."
        },
        {
            icon: <MessageCircle size={24} color={colors.primary} />,
            title: "Welcome Messages",
            description: "Automatically welcome new members instantly after registration."
        },
        {
            icon: <Calendar size={24} color={colors.primary} />,
            title: "Attendance Alerts",
            description: "Notify clients about expired memberships and renewals."
        },
        {
            icon: <Zap size={24} color={colors.primary} />,
            title: "Professional Branding",
            description: "Use your own Business WhatsApp Account for all communications."
        }
    ]

    return (
        <Screen preset="fixed" contentContainerStyle={[$styles.flex1]} safeAreaEdges={["bottom"]}>
            <Header
                title="Premium Integration"
                leftIcon="caretLeft"
                onLeftPress={() => navigation.goBack()}
                backgroundColor={colors.surface}
            />
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <View style={themed($heroSection)}>
                    <View style={themed($heroIconWrapper)}>
                        <MessageCircle size={48} color="#fff" fill="#fff" />
                    </View>
                    <Text preset="heading" style={{ textAlign: 'center', marginBottom: spacing.xs }}>
                        WhatsApp Business API
                    </Text>
                    <Text preset="subheading" style={{ textAlign: 'center', color: colors.textDim }}>
                        Automate your gym communication
                    </Text>
                </View>

                <View style={themed($featuresSection)}>
                    <Text preset="bold" style={{ marginBottom: spacing.md, fontSize: 18 }}>
                        Why Upgrade?
                    </Text>
                    {features.map((feature, index) => (
                        <FeatureItem key={index} {...feature} />
                    ))}
                </View>

                <View style={themed($requirementsSection)}>
                    <Text preset="bold" style={{ marginBottom: spacing.sm }}>Requirements:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                        <CheckCircle size={16} color={colors.success} style={{ marginRight: 8 }} />
                        <Text size="xs">Active Facebook Business Manager Account</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CheckCircle size={16} color={colors.success} style={{ marginRight: 8 }} />
                        <Text size="xs">Phone Number (not used on WhatsApp App)</Text>
                    </View>
                </View>

                <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
                    <Text size="xs" style={{ textAlign: 'center', marginBottom: spacing.md, color: colors.textDim }}>
                        Setup requires manual verification and configuration. Our team will guide you through the process.
                    </Text>
                    <Button
                        text="Contact Setup Team"
                        preset="reversed"
                        onPress={() => navigation.navigate("Help Center")}
                        RightAccessory={() => <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />}
                    />
                </View>
            </ScrollView>
        </Screen>
    )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    paddingHorizontal: spacing.md,
})

const $heroSection: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
})

const $heroIconWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#25D366', // WhatsApp Green
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
})

const $featuresSection: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})

const $featureItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
})

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
})

const $requirementsSection: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
})
