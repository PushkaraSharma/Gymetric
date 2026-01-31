import { View, ViewStyle, TextStyle } from 'react-native'
import React from 'react'
import { useAppTheme } from '@/theme/context';
import { Text } from './Text';
import { getInitials } from '@/utils/Helper';
import { ThemedStyle } from '@/theme/types';

interface ProfileInitialLogoProps {
    name: string;
    size?: number;
}

const ProfileInitialLogo = ({ name, size = 50 }: ProfileInitialLogoProps) => {
    const { themed, theme: { colors, typography } } = useAppTheme();

    return (
        <View style={themed($container(size))}>
            <Text style={themed($text)} size='md'>{getInitials(name)}</Text>
        </View>
    )
}

export default ProfileInitialLogo

const $container: (size: number) => ThemedStyle<ViewStyle> = (size) => ({ colors }) => ({
    backgroundColor: colors.primaryBackground,
    borderRadius: size / 2,
    marginRight: 15,
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
})

const $text: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    color: colors.primary,
    fontFamily: typography.primary.bold,
})