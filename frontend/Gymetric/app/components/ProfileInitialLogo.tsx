import { StyleSheet, View } from 'react-native'
import React from 'react'
import { useAppTheme } from '@/theme/context';
import { colors } from '@/theme/colors';
import { Text } from './Text';
import { getInitials } from '@/utils/Helper';

const ProfileInitialLogo = ({ name }: { name: string }) => {
    const { themed } = useAppTheme();

    return (
        <View style={themed({ backgroundColor: colors.palette.primary100, borderRadius: 25, marginRight: 15, width: 50, height: 50, alignItems: 'center', justifyContent: 'center' })}>
            <Text style={themed({ color: colors.palette.primary500 })} size='md'>{getInitials(name)}</Text>
        </View>
    )
}

export default ProfileInitialLogo

const styles = StyleSheet.create({})