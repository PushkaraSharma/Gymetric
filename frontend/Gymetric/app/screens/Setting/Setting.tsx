import { Platform, StyleSheet, View } from 'react-native'
import React, { JSX } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { colors } from '@/theme/colors'
import { Ionicons, Octicons } from '@expo/vector-icons'
import { spacing } from '@/theme/spacing'

const Setting = () => {

  const CardWithPrefixIcon = ({ title, description, icon }: { title: string, description: string, icon: JSX.Element }) => (
    <View style={[$styles.card, $styles.flexRow, { padding: spacing.md }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '85%' }}>
        <View style={{ padding: 10, borderRadius: 5, backgroundColor: colors.palette.primary100, marginRight: 15 }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text preset='subheading'>{title}</Text>
          <Text size='xs' style={{ color: colors.textDim }} numberOfLines={1}>{description}</Text>
        </View>
      </View>
      <Ionicons name='chevron-forward' size={20} color={colors.tintInactive} />
    </View>
  );

  return (
    <Screen
      preset="auto"
      safeAreaEdges={["top"]}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Text preset="heading">Settings</Text>
      <View style={{ flex: 1 }}>
        <CardWithPrefixIcon title='Manage Membership' description='Manage plans, pricing and membership durations' icon={<Octicons name='people' size={25} color={colors.tint} />} />
        <CardWithPrefixIcon title='Business Profile' description='Gym details, location and hours' icon={<Octicons name='people' size={25} color={colors.tint} />} />
      </View>
    </Screen>
  )
}

export default Setting

const styles = StyleSheet.create({})