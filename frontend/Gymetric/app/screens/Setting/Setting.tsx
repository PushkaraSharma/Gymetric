import { Linking, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import React, { JSX } from 'react'
import { useFocusEffect } from '@react-navigation/native';
import { api } from '@/services/Api';
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Text } from '@/components/Text'
import { useAppTheme } from '@/theme/context'
import {
  ChevronRight,
  Users,
  Building,
  HelpCircle,
  FileText,
  CreditCard,
  MessageCircle,
  Key
} from 'lucide-react-native'
import { navigate } from '@/navigators/navigationUtilities'
import { ThemedStyle } from '@/theme/types'
import { Skeleton } from '@/components/Skeleton'

const Setting = () => {
  const { theme: { colors, spacing }, themed } = useAppTheme()
  const [hasWhatsapp, setHasWhatsapp] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const checkSettings = async () => {
        setIsLoading(true);
        const response = await api.getSettings();
        if (response.kind === 'ok' && response.data?.hasWhatsappConfigured) {
          setHasWhatsapp(true);
        } else {
          setHasWhatsapp(false);
        }
        setIsLoading(false);
      };
      checkSettings();
    }, [])
  );

  const CardWithPrefixIcon = ({ navigateRoute, title, description, icon, noCard }: { navigateRoute: string, title: string, description?: string, icon: JSX.Element, noCard?: boolean }) => (
    <Pressable
      style={[!noCard && themed($card), $styles.flexRow, { padding: spacing.sm }]}
      onPress={() => navigateRoute === 'Terms' ? Linking.openURL('https://gymetric.indieroots.in/terms') : navigate(navigateRoute)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '85%' }}>
        <View style={themed($iconWrapper)}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text preset='formLabel' style={themed({ color: colors.text })}>{title}</Text>
          {description && <Text size='xs' style={themed({ color: colors.textDim })} numberOfLines={1}>{description}</Text>}
        </View>
      </View>
      <ChevronRight size={20} color={colors.tintInactive} />
    </Pressable>
  );

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      contentContainerStyle={themed($container)}
    >
      <Text preset="heading" style={themed({ marginBottom: spacing.lg })}>Settings</Text>
      <View style={{ flex: 1 }}>
        <CardWithPrefixIcon
          navigateRoute='Memberships'
          title='Manage Membership'
          description='Manage plans, pricing and membership durations'
          icon={<CreditCard size={22} color={colors.primary} />}
        />
        <CardWithPrefixIcon
          navigateRoute='Business Profile'
          title='Business Profile'
          description='Gym details, location and hours'
          icon={<Building size={22} color={colors.primary} />}
        />
        <CardWithPrefixIcon
          navigateRoute='Change Password'
          title='Change Password'
          description='Update your account password'
          icon={<Key size={22} color={colors.primary} />}
        />
        {isLoading ? (
          <View style={[themed($card), $styles.flexRow, { padding: spacing.sm }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Skeleton width={44} height={44} borderRadius={12} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width="60%" height={20} style={{ marginBottom: 4 }} />
                <Skeleton width="40%" height={14} />
              </View>
            </View>
          </View>
        ) : hasWhatsapp ? (
          <CardWithPrefixIcon
            navigateRoute='Notification Settings'
            title='Notification Settings'
            description='Manage WhatsApp alerts and reminders'
            icon={<MessageCircle size={22} color={colors.primary} />}
          />
        ) : (
          <CardWithPrefixIcon
            navigateRoute='WhatsApp Premium'
            title='Connect WhatsApp'
            description='Automate reminders & messages'
            icon={<MessageCircle size={22} color={colors.primary} />}
          />
        )}
      </View>

      <View style={{ marginBottom: spacing.xl }}>
        <Text preset='subheading' style={themed({ marginBottom: spacing.sm })}>Support</Text>
        <View style={themed($supportCard)}>
          <CardWithPrefixIcon
            navigateRoute='Help Center'
            title='Help Center'
            icon={<HelpCircle size={22} color={colors.primary} />}
            noCard
          />
          <View style={themed($divider)} />
          <CardWithPrefixIcon
            navigateRoute='Terms'
            title='Terms of Service'
            icon={<FileText size={22} color={colors.primary} />}
            noCard
          />
        </View>
      </View>
    </Screen>
  )
}

export default Setting

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  flex: 1,
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})

const $iconWrapper: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  backgroundColor: colors.primaryBackground,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 16,
})

const $supportCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: 'hidden',
})

const $divider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginHorizontal: 16,
})