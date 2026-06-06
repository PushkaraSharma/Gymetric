import React from 'react'
import { View, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'

type Props = {
    title: string
    subtitle?: string
    right?: React.ReactNode
}

export function ClientSectionLabel({ title, subtitle, right }: Props) {
    const { theme: { colors, spacing }, themed } = useAppTheme()

    return (
        <View style={themed($row)}>
            <View style={{ flex: 1 }}>
                <Text size="xs" weight="bold" style={{ color: colors.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</Text>
                {subtitle && <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>{subtitle}</Text>}
            </View>
            {right}
        </View>
    )
}

const $row: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
})
