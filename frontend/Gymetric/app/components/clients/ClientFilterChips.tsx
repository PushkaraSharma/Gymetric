import React from 'react'
import { ScrollView, Pressable, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'

export type ClientFilter = {
    id: string
    label: string
    count?: number
}

type Props = {
    filters: ClientFilter[]
    selected: string
    onSelect: (id: string) => void
}

export function ClientFilterChips({ filters, selected, onSelect }: Props) {
    const { theme: { colors, typography }, themed } = useAppTheme()

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, gap: 8, paddingBottom: 4 }}
        >
            {filters.map((f) => {
                const isActive = selected === f.id
                return (
                    <Pressable
                        key={f.id}
                        onPress={() => onSelect(f.id)}
                        style={[themed($chip), isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    >
                        <Text
                            size="xs"
                            weight={isActive ? 'semiBold' : 'normal'}
                            style={{ color: isActive ? colors.background : colors.textDim }}
                        >
                            {f.label}{f.count !== undefined ? ` (${f.count})` : ''}
                        </Text>
                    </Pressable>
                )
            })}
        </ScrollView>
    )
}

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
})
