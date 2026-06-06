import React from 'react'
import { View, TextInput, Pressable, ViewStyle } from 'react-native'
import { Search, X } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'

type Props = {
    value: string
    onChangeText: (text: string) => void
    placeholder?: string
}

export function ClientSearchBar({ value, onChangeText, placeholder = 'Search by name or phone...' }: Props) {
    const { theme: { colors }, themed } = useAppTheme()

    return (
        <View style={themed($container)}>
            <Search size={20} color={colors.textDim} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textDim}
                returnKeyType="search"
                style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
            {value.length > 0 && (
                <Pressable onPress={() => onChangeText('')} hitSlop={8}>
                    <X size={18} color={colors.textDim} />
                </Pressable>
            )}
        </View>
    )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
})
