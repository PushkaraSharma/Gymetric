import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { $styles } from '@/theme/styles'
import { goBack } from '@/navigators/navigationUtilities'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '@/theme/context'

const HeaderbackButton = () => {
    const { themed } = useAppTheme();

    return (
        <Pressable style={themed([$styles.row, { paddingHorizontal: 10 }])} onPress={goBack}>
            <Ionicons name={'chevron-back'} size={25} />
        </Pressable>
    )
}

export default HeaderbackButton