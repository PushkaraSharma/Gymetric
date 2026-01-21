import { Platform, Pressable, StyleSheet, View } from 'react-native'
import React, { JSX } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { colors } from '@/theme/colors'
import { Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons'
import { spacing } from '@/theme/spacing'
import { navigate } from '@/navigators/navigationUtilities'

const Setting = () => {

  const CardWithPrefixIcon = ({ navigateRoute, title, description, icon, noCard, disable }: { navigateRoute: string, title: string, description?: string, icon: JSX.Element, noCard?: boolean, disable?: boolean }) => (
    <Pressable disabled={disable} style={[!noCard && $styles.card, $styles.flexRow, { padding: spacing.md }]} onPress={() => navigate(navigateRoute)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '85%' }}>
        <View style={{ padding: 10, borderRadius: 5, backgroundColor: colors.palette.primary100, marginRight: 15 }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text preset={noCard ? 'formLabel' : 'subheading'}>{title}</Text>
          {description && <Text size='xs' style={{ color: colors.textDim }} numberOfLines={1}>{description}</Text>}
        </View>
      </View>
      <Ionicons name='chevron-forward' size={20} color={colors.tintInactive} />
    </Pressable>
  );

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      contentContainerStyle={{ paddingHorizontal: 15, flex: 1 }}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Text preset="heading">Settings</Text>
      <View style={{ flex: 1 }}>
        <CardWithPrefixIcon navigateRoute='Memberships' title='Manage Membership' description='Manage plans, pricing and membership durations' icon={<Octicons name='people' size={25} color={colors.tint} />} />
        <CardWithPrefixIcon navigateRoute='Business Profile' title='Business Profile' description='Gym details, location and hours' icon={<Octicons name='people' size={25} color={colors.tint} />} />
      </View>
      <View>
        <Text preset='subheading'>Support</Text>
        <View style={[$styles.card, { padding: 0 }]}>
          <CardWithPrefixIcon navigateRoute='Contact Details' title='Help Center' icon={<MaterialIcons name='support-agent' size={25} color={colors.tint} />} noCard disable/>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          <CardWithPrefixIcon navigateRoute='Contact Details' title='Terms of Service' icon={<Ionicons name='document-text-outline' size={25} color={colors.tint} />} noCard disable/>
        </View>
      </View>
    </Screen>
  )
}

export default Setting

const styles = StyleSheet.create({})