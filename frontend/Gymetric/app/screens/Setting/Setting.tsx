import React, { useEffect, useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { Database, Download, MessageCircle, Receipt, ShieldCheck } from 'lucide-react-native'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Skeleton } from '@/components/Skeleton'
import { MenuRow, MenuSection } from '@/components/common/MenuRow'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { api } from '@/services/Api'
import { useFeature, usePermissions, useViewer } from '@/utils/permissions'
import { PlanChip } from '@/components/premium/PlanChip'
import { showPremium } from '@/utils/premium'
import { useAppSelector } from '@/redux/Hooks'
import { selectAllClients, selectGymInfo } from '@/redux/state/GymStates'
import { clientsReport, shareReportCsv, shareReportPdf } from '@/utils/reportExport'
import Toast from 'react-native-toast-message'

const Setting = () => {
  const { theme: { colors, spacing } } = useAppTheme()
  const can = usePermissions()
  const viewer = useViewer()
  const hasStaff = useFeature('staff')
  const hasReports = useFeature('reports')
  const planHasWhatsapp = useFeature('whatsapp')
  const clients = useAppSelector(selectAllClients)
  const gym = useAppSelector(selectGymInfo)
  const canWhatsapp = can('whatsapp.settings')
  const [hasWhatsapp, setHasWhatsapp] = useState<boolean | null>(null)

  useEffect(() => {
    if (!canWhatsapp) return
    api.getSettings().then((response) => setHasWhatsapp(response.kind === 'ok' && !!response.data?.hasWhatsappConfigured))
  }, [canWhatsapp])

  // Built from the client list already on the phone, shared like a report. Paid, like report exports.
  const exportClients = () => {
    if (!hasReports) return showPremium('reports', 'settings_export_clients')
    if (!clients?.length) return Toast.show({ type: 'info', text1: 'No clients to export yet' })
    const report = clientsReport(clients)
    const share = (format: 'pdf' | 'csv') =>
      (format === 'pdf' ? shareReportPdf(report, gym?.name ?? 'GymKarta') : shareReportCsv(report)).catch(() =>
        Toast.show({ type: 'error', text1: 'Could not export clients' }),
      )
    Alert.alert('Export clients', `${clients.length} clients`, [
      { text: 'PDF', onPress: () => share('pdf') },
      { text: 'CSV / Excel', onPress: () => share('csv') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <Screen preset="fixed" safeAreaEdges={['bottom']} contentContainerStyle={{ flex: 1 }}>
      <Header title="Settings" leftIcon="caretLeft" onLeftPress={goBack} backgroundColor={colors.surface} safeAreaTop />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Push alerts are personal, so they live on My Profile. */}
        {canWhatsapp ? (
          <MenuSection title="WHATSAPP">
            {hasWhatsapp === null ? (
              <View style={{ padding: spacing.md }}>
                <Skeleton width="100%" height={40} borderRadius={12} />
              </View>
            ) : planHasWhatsapp ? (
              <MenuRow
                icon={MessageCircle}
                label={hasWhatsapp ? 'WhatsApp settings' : 'Connect WhatsApp'}
                description={hasWhatsapp ? 'Automatic reminders and templates' : 'Send reminders and receipts on WhatsApp'}
                color={colors.success}
                onPress={() => navigate(hasWhatsapp ? 'Notification Settings' : 'WhatsApp Premium')}
              />
            ) : (
              <MenuRow
                icon={MessageCircle}
                label="WhatsApp automation"
                description="Welcome, renewal and expiry messages"
                color={colors.success}
                onPress={() => showPremium('whatsapp', 'settings_whatsapp')}
                right={<PlanChip feature="whatsapp" />}
              />
            )}
          </MenuSection>
        ) : null}

        {can('settings.branch') ? (
          <MenuSection title="RECEIPTS">
            <MenuRow
              icon={Receipt}
              label="Receipt settings"
              description="Logo, signature, footer and share format"
              onPress={() => navigate('Receipt Settings')}
            />
          </MenuSection>
        ) : null}

        {can('reports.view') ? (
          <MenuSection title="DATA">
            <MenuRow
              icon={Download}
              label="Export clients"
              description="Plan, end date and balance per client"
              onPress={exportClients}
              right={hasReports ? undefined : <PlanChip feature="reports" />}
            />
          </MenuSection>
        ) : null}

        {can('settings.access') ? (
          <MenuSection title="TEAM">
            <MenuRow
              icon={ShieldCheck}
              label="Access control"
              description="Roles and what each one can do"
              onPress={() => (hasStaff ? navigate('Access Control') : showPremium('staff', 'settings_access'))}
              right={hasStaff ? undefined : <PlanChip feature="staff" />}
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
