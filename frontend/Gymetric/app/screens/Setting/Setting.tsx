import React, { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Bell, Database, MessageCircle, ShieldCheck } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Skeleton } from '@/components/Skeleton'
import { MenuRow, MenuSection } from '@/components/common/MenuRow'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { usePermissions, useViewer } from '@/utils/permissions'

const Setting = () => {
  const { theme: { colors, spacing } } = useAppTheme()
  const can = usePermissions()
  const viewer = useViewer()
  const canWhatsapp = can('whatsapp.settings')
  const [hasWhatsapp, setHasWhatsapp] = useState<boolean | null>(null)

  useEffect(() => {
    if (!canWhatsapp) return
    api.getSettings().then((response) => setHasWhatsapp(response.kind === 'ok' && !!response.data?.hasWhatsappConfigured))
  }, [canWhatsapp])

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header title="Settings" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <MenuSection title="NOTIFICATIONS">
          <MenuRow
            icon={Bell}
            label="Push notifications"
            description="Daily expiry and balance alerts on this phone"
            onPress={() => navigate('Push Notification Settings')}
            divider={canWhatsapp}
          />
          {canWhatsapp ? (
            hasWhatsapp === null ? (
              <View style={{ padding: spacing.md }}>
                <Skeleton width="100%" height={40} borderRadius={12} />
              </View>
            ) : (
              <MenuRow
                icon={MessageCircle}
                label={hasWhatsapp ? 'WhatsApp settings' : 'Connect WhatsApp'}
                description={hasWhatsapp ? 'Automatic reminders and templates' : 'Send reminders and receipts on WhatsApp'}
                color={colors.success}
                onPress={() => navigate(hasWhatsapp ? 'Notification Settings' : 'WhatsApp Premium')}
              />
            )
          ) : null}
        </MenuSection>

        {can('settings.access') ? (
          <MenuSection title="TEAM">
            <MenuRow
              icon={ShieldCheck}
              label="Access control"
              description="Roles and what each one can do"
              onPress={() => navigate('Access Control')}
            />
          </MenuSection>
        ) : null}

        {__DEV__ && viewer.roleKey === 'owner' ? (
          <MenuSection title="DEVELOPER">
            <MenuRow icon={Database} label="Seed demo data" color={colors.textDim} onPress={() => navigate('Seed Data')} />
          </MenuSection>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

export default Setting
