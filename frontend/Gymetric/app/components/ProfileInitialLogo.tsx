import { View, ViewStyle, TextStyle, Image, ImageStyle } from 'react-native'
import React from 'react'
import { useAppTheme } from '@/theme/context';
import { Text } from './Text';
import { getInitials } from '@/utils/Helper';
import { ThemedStyle } from '@/theme/types';

interface ProfileInitialLogoProps {
    name: string;
    size?: number;
    imageUrl?: string;
    sideMargin?: boolean;
}

const ProfileInitialLogo = ({ name, size = 50, imageUrl, sideMargin = true }: ProfileInitialLogoProps) => {
    const { themed, theme: { colors, typography } } = useAppTheme();

    return (
        <View style={themed($container(size, sideMargin))}>
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={$image(size)}
                    resizeMode="cover"
                />
            ) : (
                <Text style={themed($text)} size='md'>{getInitials(name)}</Text>
            )}
        </View>
    )
}

export default ProfileInitialLogo

const $container: (size: number, sideMargin: boolean) => ThemedStyle<ViewStyle> = (size, sideMargin) => ({ colors }) => ({
    backgroundColor: colors.primaryBackground,
    borderRadius: size / 2,
    marginRight: sideMargin ? 15 : 0,
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
})

const $image = (size: number): ImageStyle => ({
    width: size,
    height: size,
})

const $text: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    color: colors.primary,
    fontFamily: typography.primary.bold,
})