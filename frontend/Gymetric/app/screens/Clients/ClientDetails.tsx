import { Platform, Pressable, ScrollView, View, Linking, ViewStyle, Alert } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { useAppTheme } from '@/theme/context'
import { goBack, navigate } from '@/navigators/navigationUtilities'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { api } from '@/services/Api'
import { Text } from '@/components/Text'
import { differenceInCalendarDays, formatDate, startOfDay, parseISO } from 'date-fns'
import { useFocusEffect } from '@react-navigation/native'
import NoDataFound from '@/components/NoDataFound'
import Toast from 'react-native-toast-message'
import ProfileInitialLogo from '@/components/ProfileInitialLogo'
import { Skeleton } from '@/components/Skeleton'
import { CustomModal } from '@/components/CustomModal'
import CollectPaymentModal from './CollectPaymentModal'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import { ClientSectionLabel } from '@/components/clients/ClientSectionLabel'
import {
    Wallet, Calendar, CreditCard, Clock, Pause, Play, Pencil, RefreshCw, Receipt, Activity
} from 'lucide-react-native'
import { Header } from '@/components/Header'
import { StatItem } from '@/components/clients/ClientStatGrid'
import { ImagePreviewModal } from '@/components/common/ImagePreviewModal'

const ClientDetails = ({ route }: any) => {
    const { theme: { colors }, themed } = useAppTheme()

    const [client, setClient] = useState<{ [key: string]: any } | null>(null)
    const [membershipDays, setMembershipDays] = useState<{ total: number, remain: number, used: number, progress: number, endDate: string }>({ total: 0, remain: 0, used: 0, progress: 0, endDate: '-' })
    const [isLoading, setIsLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showPause, setShowPause] = useState(false)
    const [loader, setLoader] = useState(false)
    const [showCollectModal, setShowCollectModal] = useState(false)
    const [showImagePreview, setShowImagePreview] = useState(false)
    const [activity, setActivity] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'Payments' | 'Activity' | 'History'>('Payments')

    const handleDelete = async () => {
        setLoader(true)
        const response = await api.deleteClient(client?._id)
        setLoader(false)
        setShowDeleteModal(false)
        if (response.kind === 'ok') {
            Toast.show({ type: 'success', text1: 'Client deleted successfully' })
            goBack()
        } else {
            Toast.show({ type: 'error', text1: 'Failed', text2: response.message || 'Could not delete client' })
        }
    }

    const getDaysProgress = (startStr: string, endStr: string) => {
        if (!startStr || !endStr) return
        const start = startOfDay(parseISO(startStr))
        const end = startOfDay(parseISO(endStr))
        const today = startOfDay(new Date())
        const total = differenceInCalendarDays(end, start) + 1
        let used = 0
        let remain = 0
        if (today < start) {
            used = 0
            remain = total
        } else {
            remain = Math.max(0, differenceInCalendarDays(end, today))
            used = Math.min(total, Math.max(0, differenceInCalendarDays(today, start) + 1))
        }
        const progress = total > 0 ? used / total : 0
        setMembershipDays({ total, remain, used, progress: Math.min(Math.max(progress, 0), 1), endDate: formatDate(end, 'dd MMM yyyy') })
    }

    const clientInfo = async () => {
        setIsLoading(true)
        const [clientRes, activityRes] = await Promise.all([
            api.getClient(route?.params?.data?._id),
            api.getClientActivity(route?.params?.data?._id),
        ])
        if (clientRes.kind === 'ok') {
            setClient(clientRes.data)
            const displayMembership = clientRes.data.activeMembership || clientRes.data.upcomingMembership
            if (displayMembership) getDaysProgress(displayMembership.startDate, displayMembership.endDate)
        }
        if (activityRes.kind === 'ok') setActivity(activityRes.data || [])
        setIsLoading(false)
    }

    const callNumber = async (phoneNumber: string) => { await Linking.openURL(`tel:${phoneNumber}`) }

    const openWhatsAppChat = async (phoneNumber: string, message = "") => {
        if (!phoneNumber) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Phone number is missing' })
            return
        }
        const formattedNumber = phoneNumber.replace(/\D/g, "")
        const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`
        try { await Linking.openURL(url) }
        catch { Toast.show({ type: 'error', text1: 'Error', text2: 'Could not open WhatsApp' }) }
    }

    const handlePause = async () => {
        setLoader(true);
        const memb = client?.activeMembership
        setLoader(false);
        if (!memb) return
        setShowPause(false)
        const res = await api.pauseMembership({ membershipId: memb._id })
        if (res.kind === 'ok') { Toast.show({ type: 'success', text1: 'Membership paused' }); clientInfo() }
    }

    const handleResume = async () => {
        setLoader(true);
        const memb = client?.activeMembership
        setLoader(false);
        setShowPause(false)
        if (!memb) return
        const res = await api.resumeMembership({ membershipId: memb._id })
        if (res.kind === 'ok') { Toast.show({ type: 'success', text1: 'Membership resumed' }); clientInfo() }
    }

    const displayMembership = client?.activeMembership || client?.upcomingMembership
    const isPaused = client?.membershipStatus === 'paused'
    const canEdit = displayMembership && ['active', 'future', 'trial', 'paused'].includes(displayMembership?.status)

    const totalPaid = useMemo(() => {
        if (!client?.paymentHistory?.length) return 0
        return client.paymentHistory.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    }, [client?.paymentHistory])

    const statusColor = useMemo(() => {
        const s = client?.membershipStatus ?? ''
        if (s === 'active' || s === 'paused') return { bg: colors.activeBg, text: colors.activeTxt }
        if (s === 'trial' || s === 'future') return { bg: colors.palette.indigo100, text: colors.primary }
        return { bg: colors.errorBackground, text: colors.error }
    }, [client?.membershipStatus, colors])

    const stats: StatItem[] = useMemo(() => [
        {
            label: 'Balance Due',
            value: (client?.balance ?? 0) > 0 ? `₹${client?.balance}` : '₹0',
            icon: <Wallet size={18} color={client?.balance > 0 ? colors.error : colors.primary} />,
            color: client?.balance > 0 ? colors.error : colors.primary,
            bg: client?.balance > 0 ? colors.errorBackground : colors.primaryBackground,
        },
        {
            label: 'Days Left',
            value: displayMembership ? `${membershipDays.remain}` : '—',
            icon: <Calendar size={18} color={membershipDays.remain > 0 ? colors.primary : colors.error} />,
            color: membershipDays.remain > 0 ? colors.primary : colors.error,
            bg: membershipDays.remain > 0 ? colors.primaryBackground : colors.errorBackground,
        },
        {
            label: 'Total Paid',
            value: `₹${totalPaid}`,
            icon: <CreditCard size={18} color={colors.primary} />,
            color: colors.primary,
            bg: colors.primaryBackground,
        },
        {
            label: 'Member Since',
            value: client?.createdAt ? formatDate(client.createdAt, 'MMM yy') : '—',
            icon: <Clock size={18} color={colors.textDim} />,
            color: colors.textDim,
            bg: colors.surface,
        },
    ], [client, displayMembership, membershipDays, totalPaid, colors])

    const pastMemberships = useMemo(() =>
        client?.membershipHistory?.filter((m: any) =>
            m._id !== client?.activeMembership?._id && m._id !== client?.upcomingMembership?._id
        ) || [],
        [client]
    )

    const sortedPayments = useMemo(() =>
        client?.paymentHistory?.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [],
        [client?.paymentHistory]
    )

    useFocusEffect(useCallback(() => { clientInfo() }, []))

    if (isLoading) {
        return (
            <Screen preset="fixed" contentContainerStyle={[$styles.flex1]} safeAreaEdges={[]}>
                <Header
                    title='Member Profile'
                    backgroundColor={colors.surface}
                    leftIcon="caretLeft"
                    onLeftPress={goBack}
                    safeAreaTop={true}
                />
                <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                    <Skeleton width="100%" height={180} borderRadius={20} style={{ marginBottom: spacing.md }} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                        <Skeleton width="48%" height={90} borderRadius={16} />
                        <Skeleton width="48%" height={90} borderRadius={16} />
                    </View>
                    <Skeleton width="100%" height={200} borderRadius={16} />
                </ScrollView>
            </Screen>
        )
    }

    return (
        <Screen preset="fixed" contentContainerStyle={[$styles.flex1]} safeAreaEdges={[]} {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}>
            <Header
                title='Member Profile'
                backgroundColor={colors.surface}
                leftIcon="caretLeft"
                onLeftPress={goBack}
                safeAreaTop={true}
                rightAction={
                    <Pressable onPress={() => setShowDeleteModal(true)} style={themed($iconBtn)}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </Pressable>
                }
            />

            <CustomModal
                visible={showDeleteModal}
                title="Delete Client"
                message={`Are you sure you want to delete ${client?.name}?`}
                confirmText={loader ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
                type="destructive"
            />

            <CustomModal
                visible={showPause}
                title={`${isPaused ? "Resume" : "Pause"} Membership`}
                message={`Are you sure you want to ${isPaused ? "resume" : "pause"} ${client?.name}'s membership?`}
                confirmText={loader ? `${isPaused ? "Pausing..." : "Resuming..."}` : isPaused ? "Resume" : "Pause"}
                cancelText="Cancel"
                onConfirm={isPaused ? handleResume : handlePause}
                onCancel={() => setShowPause(false)}
                type="default"
            />

            <CollectPaymentModal visible={showCollectModal} onClose={() => setShowCollectModal(false)} client={client} onSuccess={clientInfo} />
            <ImagePreviewModal visible={showImagePreview} imageUrl={client?.profilePicture} onClose={() => setShowImagePreview(false)} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                {/* Hero card with integrated stats and edit */}
                <View style={[themed($heroCard), { margin: spacing.md }]}>
                    <Pressable
                        style={themed($editBtn)}
                        onPress={() => navigate('Update Basic Information', { client })}
                    >
                        <Pencil size={18} color={colors.textDim} />
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <Pressable disabled={!client?.profilePicture} onPress={() => setShowImagePreview(true)}>
                            <ProfileInitialLogo name={client?.name ?? ''} size={60} imageUrl={client?.profilePicture} sideMargin={false} />
                        </Pressable>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                                <Text weight="bold" size="md">{client?.name}</Text>
                                <View style={[themed($statusPill), { backgroundColor: statusColor.bg }]}>
                                    <Text size="xxs" weight="semiBold" style={{ color: statusColor.text, textTransform: 'capitalize' }}>{client?.membershipStatus}</Text>
                                </View>
                                {client?.role === 'dependent' && (
                                    <View style={[themed($statusPill), { backgroundColor: colors.primaryBackground }]}>
                                        <Text size="xxs" weight="medium" style={{ color: colors.primary }}>Dependent</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: spacing.xs }}>
                                <Text size="xs" style={{ color: colors.textDim }}>{client?.phoneNumber}</Text>
                                <Pressable onPress={() => callNumber(client?.phoneNumber)} style={themed($contactCircleBtn)}>
                                    <Ionicons name="call" size={14} color={colors.primary} />
                                    <Text size="xxs" style={{ color: colors.primary }}>Call</Text>
                                </Pressable>
                                <Pressable onPress={() => openWhatsAppChat(client?.phoneNumber)} style={themed($contactCircleBtn)}>
                                    <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                                    <Text size="xxs" style={{ color: "#25D366" }}>WhatsApp</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    <View style={themed($divider)} />

                    <View style={themed($statsRow)}>
                        <View style={themed($statBox)}>
                            <Text size="xxs" style={{ color: colors.textDim }}>Balance Due</Text>
                            <Text weight="bold" size="sm" style={{ color: (client?.balance ?? 0) > 0 ? colors.error : colors.text, marginTop: 2 }}>
                                ₹{client?.balance ?? 0}
                            </Text>
                        </View>
                        <View style={themed($statBox)}>
                            <Text size="xxs" style={{ color: colors.textDim }}>Days Left</Text>
                            <Text weight="bold" size="sm" style={{ color: membershipDays.remain > 0 ? colors.text : colors.error, marginTop: 2 }}>
                                {displayMembership ? `${membershipDays.remain}` : '—'}
                            </Text>
                        </View>
                        <View style={themed($statBox)}>
                            <Text size="xxs" style={{ color: colors.textDim }}>Total Paid</Text>
                            <Text weight="bold" size="sm" style={{ marginTop: 2 }}>
                                ₹{totalPaid}
                            </Text>
                        </View>
                        <View style={themed($statBox)}>
                            <Text size="xxs" style={{ color: colors.textDim }}>Since</Text>
                            <Text weight="bold" size="sm" style={{ marginTop: 2 }}>
                                {client?.createdAt ? formatDate(client.createdAt, 'MMM yy') : '—'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quick actions */}
                <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                        {client?.balance > 0 && client?.role === 'primary' && (
                            <Pressable style={themed($actionChip)} onPress={() => setShowCollectModal(true)}>
                                <Wallet size={16} color={colors.primary} />
                                <Text size="xs" weight="semiBold" style={{ marginLeft: 6, color: colors.primary }}>Collect</Text>
                            </Pressable>
                        )}
                        <Pressable
                            style={themed($actionChip)}
                            onPress={() => client?.upcomingMembership
                                ? Toast.show({ type: 'error', text1: 'Already has upcoming plan' })
                                : navigate('Renew Membership', { client })}
                            disabled={membershipDays?.used === 0 && !!client?.activeMembership}
                        >
                            <RefreshCw size={16} color={colors.primary} />
                            <Text size="xs" weight="semiBold" style={{ marginLeft: 6, color: colors.primary }}>Renew</Text>
                        </Pressable>
                        {canEdit && (
                            <Pressable style={themed($actionChip)} onPress={() => navigate('Edit Membership', { client, membership: displayMembership })}>
                                <Pencil size={16} color={colors.primary} />
                                <Text size="xs" weight="semiBold" style={{ marginLeft: 6, color: colors.primary }}>Edit Plan</Text>
                            </Pressable>
                        )}
                        {(client?.membershipStatus === 'active' || client?.membershipStatus === 'trial') && (
                            <Pressable style={themed($actionChip)} onPress={() => { setShowPause(true) }}>
                                <Pause size={16} color={colors.primary} />
                                <Text size="xs" weight="semiBold" style={{ marginLeft: 6, color: colors.primary }}>Pause</Text>
                            </Pressable>
                        )}
                        {isPaused && (
                            <Pressable style={themed($actionChip)} onPress={() => { setShowPause(true) }}>
                                <Play size={16} color={colors.primary} />
                                <Text size="xs" weight="semiBold" style={{ marginLeft: 6, color: colors.primary }}>Resume</Text>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>

                {/* Balance alert */}
                {(client?.balance > 0) && client?.role === 'primary' && (
                    <Pressable style={[themed($balanceAlert), { marginHorizontal: spacing.md, marginBottom: spacing.md }]} onPress={() => setShowCollectModal(true)}>
                        <View style={{ flex: 1 }}>
                            <Text size="xs" style={{ color: colors.error }}>Outstanding balance</Text>
                            <Text weight="bold" size="sm" style={{ color: colors.error }}>₹{client.balance}</Text>
                        </View>
                        <View style={[themed($collectChip), { backgroundColor: colors.error }]}>
                            <Text weight="semiBold" size="sm" style={{ color: colors.background }}>Collect</Text>
                        </View>
                    </Pressable>
                )}

                {client?.role === 'dependent' && client?.activeMembership?.primaryMemberId?.balance > 0 && (
                    <View style={[themed($infoBanner), { marginHorizontal: spacing.md, marginBottom: spacing.md }]}>
                        <Text size="xs" style={{ color: colors.textDim }}>
                            Paid by {client.activeMembership.primaryMemberId.name} — Balance ₹{client.activeMembership.primaryMemberId.balance}
                        </Text>
                    </View>
                )}

                {/* Current membership */}
                <View style={{ paddingHorizontal: spacing.md }}>
                    <ClientSectionLabel title="Current Plan" subtitle={displayMembership ? '' : 'No active plan'} />

                    {client?.activeMembership && client?.upcomingMembership && (
                        <View style={[themed($infoBanner), { marginBottom: spacing.sm }]}>
                            <Text size="xs" style={{ color: colors.primary }}>
                                Upcoming: {client.upcomingMembership.planName} starts {formatDate(client.upcomingMembership.startDate, 'dd MMM yyyy')}
                            </Text>
                        </View>
                    )}

                    {displayMembership ? (
                        <View style={themed($membershipCard)}>
                            <View style={$styles.flexRow}>
                                <View style={{ flex: 1 }}>
                                    <Text weight="bold" size="md">{displayMembership.planName}</Text>
                                    {isPaused && <Text size="xs" style={{ color: colors.primary, marginTop: 2 }}>Paused — expiry extended on resume</Text>}
                                    {displayMembership?.totalAmount && (
                                        <Text size="sm" style={{ color: colors.textDim, marginTop: 4 }}>₹{displayMembership.totalAmount}</Text>
                                    )}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text size="xs" style={{ color: colors.textDim }}>{membershipDays.remain > 0 ? 'Expires' : 'Expired'}</Text>
                                    <Text weight="semiBold" size="sm" style={{ color: membershipDays.remain > 0 ? colors.text : colors.error }}>{membershipDays.endDate}</Text>
                                </View>
                            </View>

                            <View style={{ marginTop: spacing.md }}>
                                <View style={$styles.flexRow}>
                                    <Text size="xs" style={{ color: colors.textDim }}>Days used</Text>
                                    <Text size="xs" weight="semiBold">{membershipDays.used} / {membershipDays.total}</Text>
                                </View>
                                <View style={themed($progressTrack)}>
                                    <View style={[themed($progressFill), {
                                        width: `${(membershipDays.progress || 0) * 100}%`,
                                        backgroundColor: membershipDays.remain > 0 ? colors.primary : colors.error,
                                    }]} />
                                </View>
                            </View>
                        </View>
                    ) : (
                        <NoDataFound title="No active membership" msg="This member has no active or upcoming plan" />
                    )}
                </View>

                {/* Tab selector */}
                <View style={themed($tabContainer)}>
                    {(['Payments', 'Activity', 'History'] as const).map((tab) => (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[themed($tabBtn), activeTab === tab && themed($tabBtnActive)]}
                        >
                            <Text
                                weight="semiBold"
                                size="xs"
                                style={{ color: activeTab === tab ? colors.primary : colors.textDim }}
                            >
                                {tab}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Tab content */}
                <View style={{ paddingHorizontal: spacing.md }}>
                    {activeTab === 'Payments' && (
                        <>
                            {sortedPayments.length ? sortedPayments.map((payment: any, index: number) => {
                                const isPartial = payment?.remarks?.includes('Partial')
                                return (
                                    <View key={index} style={[themed($listRow), index === 0 && { marginTop: 0 }]}>
                                        <View style={[themed($rowIcon), { backgroundColor: colors.primaryBackground }]}>
                                            <Receipt size={16} color={colors.primary} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                            <Text weight="medium" size="xs">{payment?.remarks ?? 'Membership'}</Text>
                                            <Text size="xxs" style={{ color: colors.textDim }}>
                                                {formatDate(payment?.date, 'dd MMM yyyy')} · {payment?.method}
                                                {isPartial ? ' · Partial' : ''}
                                            </Text>
                                        </View>
                                        <Text weight="semiBold">₹{payment?.amount}</Text>
                                    </View>
                                )
                            }) : (
                                <NoDataFound title="No Payments" msg="No payments recorded yet" />
                            )}
                        </>
                    )}

                    {activeTab === 'Activity' && (
                        <>
                            {activity.length ? activity.map((item, i) => (
                                <View key={i} style={[themed($listRow), i === 0 && { marginTop: 0 }]}>
                                    <View style={[themed($rowIcon), { backgroundColor: colors.surface }]}>
                                        <Activity size={16} color={colors.textDim} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                        <Text weight="medium" size="xs">{item.title}</Text>
                                        {item.description && <Text size="xxs" style={{ color: colors.textDim }}>{item.description}</Text>}
                                        <Text size="xxs" style={{ color: colors.textDim, marginTop: 2 }}>{formatDate(item.date, 'dd MMM yyyy · HH:mm')}</Text>
                                    </View>
                                </View>
                            )) : (
                                <NoDataFound title="No Activity" msg="No activity recorded yet" />
                            )}
                        </>
                    )}

                    {activeTab === 'History' && (
                        <>
                            {pastMemberships.length ? pastMemberships.map((h: any, i: number) => (
                                <View key={i} style={[themed($listRow), i === 0 && { marginTop: 0 }]}>
                                    <View style={[themed($rowIcon), { backgroundColor: colors.surface }]}>
                                        <Calendar size={16} color={colors.textDim} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                        <Text weight="medium" size="xs">{h.planName}</Text>
                                        <Text size="xxs" style={{ color: colors.textDim }}>
                                            {formatDate(h.startDate, 'dd MMM yyyy')} – {formatDate(h.endDate, 'dd MMM yyyy')}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text size="xxs" style={{ textTransform: 'capitalize', color: colors.textDim }}>{h.status}</Text>
                                        <Text weight="medium" size="sm">₹{h.totalAmount}</Text>
                                    </View>
                                </View>
                            )) : (
                                <NoDataFound title="No History" msg="No past memberships found" />
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </Screen>
    )
}

export default ClientDetails

const $iconBtn: ThemedStyle<ViewStyle> = () => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
})

const $heroCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
})

const $editBtn: ThemedStyle<ViewStyle> = () => ({
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
})

const $contactCircleBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    borderRadius: 20,
    backgroundColor: colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    gap: 2,
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs
})

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
})

const $statsRow: ThemedStyle<ViewStyle> = () => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
})

const $statBox: ThemedStyle<ViewStyle> = () => ({
    flex: 1,
    alignItems: 'center',
})

const $statusPill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
})

const $balanceAlert: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error + '40',
    padding: spacing.md,
})

const $collectChip: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
})

const $infoBanner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.primaryBackground,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
})

const $actionChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
})

const $membershipCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
})

const $progressTrack: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.xs,
    overflow: 'hidden',
})

const $progressFill: ThemedStyle<ViewStyle> = () => ({
    height: 8,
    borderRadius: 4,
})

const $listRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
})

const $rowIcon: ThemedStyle<ViewStyle> = () => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
})

const $tabContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    backgroundColor: colors.border + '30',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
})

const $tabBtn: ThemedStyle<ViewStyle> = () => ({
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
})

const $tabBtnActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
})
