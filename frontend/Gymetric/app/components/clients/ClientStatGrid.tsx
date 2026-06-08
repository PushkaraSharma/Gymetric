import React from 'react'
import { View, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'

export type StatItem = {
    label: string
    value: string
    icon: React.ReactNode
    color: string
    bg: string
}

type Props = {
    stats: StatItem[]
}

export function ClientStatGrid({ stats }: Props) {
    const { themed } = useAppTheme()

    return (
        <View style={themed($grid)}>
            {stats.map((s, i) => (
                <View key={i} style={themed($card)}>
                    <View style={[themed($iconWrap), { backgroundColor: s.bg }]}>{s.icon}</View>
                    <Text weight="bold" size="md" style={{ marginTop: 8 }}>{s.value}</Text>
                    <Text size="xxs" style={{ marginTop: 2, opacity: 0.7 }}>{s.label}</Text>
                </View>
            ))}
        </View>
    )
}

const $grid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.md,
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexGrow: 1,
    minWidth: '46%',
})

const $iconWrap: ThemedStyle<ViewStyle> = () => ({
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
})
