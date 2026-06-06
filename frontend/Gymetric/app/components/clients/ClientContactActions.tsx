import React from 'react'
import { View, Pressable, ViewStyle } from 'react-native'
import { Phone } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'

type Props = {
    onCall: () => void
    onWhatsApp: () => void
}

export function ClientContactActions({ onCall, onWhatsApp }: Props) {
    const { theme: { colors }, themed } = useAppTheme()

    return (
        <View style={themed($row)}>
            <Pressable style={themed($callBtn)} onPress={onCall}>
                <Phone size={18} color={colors.background} />
                <Text weight="semiBold" size="sm" style={{ color: colors.background, marginLeft: 8 }}>Call</Text>
            </Pressable>
            <Pressable style={themed($waBtn)} onPress={onWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text weight="semiBold" size="sm" style={{ color: '#25D366', marginLeft: 8 }}>WhatsApp</Text>
            </Pressable>
        </View>
    )
}

const $row: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
})

const $callBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
})

const $waBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D36615',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#25D36640',
})
