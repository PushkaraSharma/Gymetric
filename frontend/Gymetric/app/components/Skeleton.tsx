import { ViewStyle, DimensionValue } from 'react-native'
import { MotiView } from 'moti'
import { useAppTheme } from '@/theme/context'
import React from 'react'

interface SkeletonProps {
    width?: DimensionValue
    height?: DimensionValue
    borderRadius?: number
    style?: ViewStyle
}

export const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) => {
    const { theme: { colors } } = useAppTheme()

    return (
        <MotiView
            from={{ opacity: 0.3 }}
            animate={{ opacity: 0.7 }}
            transition={{
                type: 'timing',
                duration: 800,
                loop: true,
            }}
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: colors.border,
                },
                style,
            ]}
        />
    )
}
