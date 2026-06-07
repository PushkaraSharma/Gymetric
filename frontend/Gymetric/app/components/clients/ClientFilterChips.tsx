import React, { useRef, useEffect } from 'react'
import { FlatList, Pressable, ViewStyle } from 'react-native'
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
    const flatListRef = useRef<FlatList>(null)

    useEffect(() => {
        const index = filters.findIndex(f => f.id === selected)
        if (index !== -1 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
            }, 100)
        }
    }, [selected, filters])

    return (
        <FlatList
            ref={flatListRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filters}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 4, gap: 8, paddingBottom: 4 }}
            onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 })
                }, 100)
            }}
            renderItem={({ item: f }) => {
                const isActive = selected === f.id
                return (
                    <Pressable
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
            }}
        />
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
