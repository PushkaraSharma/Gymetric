import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, View, TouchableWithoutFeedback, ViewStyle, ActivityIndicator, StyleSheet } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { spacing } from '@/theme/spacing'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { generatePaymentReceiptHTML } from '@/utils/paymentReceiptTemplate'
import { format } from 'date-fns'
import Toast from 'react-native-toast-message'
import { WebView } from 'react-native-webview'
import ViewShot from 'react-native-view-shot'
import { api } from '@/services/Api'
import { getReceiptFormatPreference, ReceiptFormatPreference } from '@/utils/receiptPreferences'

type Props = {
    visible: boolean
    onClose: () => void
    gym: any
    client: any
    payment: any
    membership?: any
    receiptConfig?: any
}

const ShareReceiptModal = ({ visible, onClose, gym, client, payment, membership, receiptConfig }: Props) => {
    const { themed, theme: { colors } } = useAppTheme()
    const viewShotRef = useRef<any>(null)
    const hasAutoSharedRef = useRef(false)
    const [loading, setLoading] = useState(false)
    const [webViewReady, setWebViewReady] = useState(false)
    const [receiptConfigLoaded, setReceiptConfigLoaded] = useState(false)
    const [serverReceiptConfig, setServerReceiptConfig] = useState<any>(null)
    const [formatPreference, setFormatPreference] = useState<ReceiptFormatPreference>('ask')

    const mergedReceiptConfig = useMemo(() => ({
        ...(serverReceiptConfig || {}),
        ...(receiptConfig || {}),
        logo: receiptConfig?.logo || serverReceiptConfig?.logo || gym?.logo,
    }), [gym?.logo, receiptConfig, serverReceiptConfig])

    const buildHtml = () => {
        const balance = client?.balance || 0
        const isPartial = balance > 0 || payment?.remarks?.includes('Partial')
        const receiptNo = `GK-${Date.now().toString().slice(-8)}`
        return {
            html: generatePaymentReceiptHTML({
            gym: { name: gym?.name || 'Gym', address: gym?.address, logo: mergedReceiptConfig?.logo || gym?.logo },
            client: { name: client?.name, phoneNumber: client?.phoneNumber },
            payment: {
                amount: payment?.amount,
                method: payment?.method,
                date: format(new Date(payment?.date || new Date()), 'dd MMM yyyy'),
                remarks: payment?.remarks,
            },
            membership: membership ? {
                planName: membership.planName,
                startDate: membership.startDate ? format(new Date(membership.startDate), 'dd MMM yyyy') : undefined,
                endDate: membership.endDate ? format(new Date(membership.endDate), 'dd MMM yyyy') : undefined,
            } : undefined,
            balance,
            receiptNo,
            receiptConfig: mergedReceiptConfig,
            status: isPartial ? 'PARTIAL' : 'PAID',
        }),
            receiptNo,
        }
    }

    const getReceiptFileName = (receiptNo: string, ext: 'pdf' | 'png') => {
        const safeName = (client?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
        return `Receipt-${receiptNo}-${safeName}.${ext}`
    }

    const copyToNamedFile = async (sourceUri: string, filename: string) => {
        const destUri = `${FileSystem.cacheDirectory}${filename}`
        await FileSystem.copyAsync({ from: sourceUri, to: destUri })
        return destUri
    }

    const html = useMemo(() => buildHtml().html, [client, gym, membership, mergedReceiptConfig, payment])

    useEffect(() => {
        if (!visible) {
            hasAutoSharedRef.current = false
            setWebViewReady(false)
            setReceiptConfigLoaded(false)
            return
        }

        setFormatPreference(getReceiptFormatPreference())
        api.getSettings().then((res) => {
            if (res.kind === 'ok') setServerReceiptConfig(res.data?.receipt || null)
        }).finally(() => {
            setReceiptConfigLoaded(true)
        })
    }, [visible])

    const sharePdf = async () => {
        setLoading(true)
        try {
            const { html: receiptHtml, receiptNo } = buildHtml()
            const { uri } = await Print.printToFileAsync({ html: receiptHtml })
            const namedUri = await copyToNamedFile(uri, getReceiptFileName(receiptNo, 'pdf'))
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(namedUri, { mimeType: 'application/pdf', dialogTitle: 'Share Receipt' })
            }
            onClose()
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to generate receipt' })
        }
        setLoading(false)
    }

    const shareImage = async () => {
        if (!webViewReady) {
            Toast.show({ type: 'error', text1: 'Receipt preview is still loading' })
            return
        }
        setLoading(true)
        try {
            const { receiptNo } = buildHtml()
            const uri = await viewShotRef.current?.capture?.()
            if (uri && await Sharing.isAvailableAsync()) {
                const namedUri = await copyToNamedFile(uri, getReceiptFileName(receiptNo, 'png'))
                await Sharing.shareAsync(namedUri, { mimeType: 'image/png', dialogTitle: 'Share Receipt' })
            }
            onClose()
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to generate receipt image' })
        }
        setLoading(false)
    }

    useEffect(() => {
        if (!visible || loading || hasAutoSharedRef.current || !receiptConfigLoaded) return
        if (formatPreference === 'pdf') {
            hasAutoSharedRef.current = true
            sharePdf()
        } else if (formatPreference === 'image' && webViewReady) {
            hasAutoSharedRef.current = true
            shareImage()
        }
    }, [formatPreference, loading, receiptConfigLoaded, visible, webViewReady])

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <ViewShot ref={viewShotRef} style={styles.captureContainer} options={{ format: 'png', quality: 0.95 }}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    style={styles.webView}
                    scrollEnabled={false}
                    onLoadEnd={() => setWebViewReady(true)}
                />
            </ViewShot>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={themed($overlay)}>
                    <TouchableWithoutFeedback>
                        <View style={themed($box)}>
                            <Text preset="subheading" weight="bold">Share Receipt</Text>
                            <Text size="xs" style={{ color: colors.textDim, marginVertical: spacing.sm }}>
                                Payment of ₹{payment?.amount} recorded successfully
                            </Text>
                            {loading ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                <>
                                    <Button title="Share as Image" onPress={shareImage} style={{ marginBottom: spacing.sm }} disabled={!webViewReady || !receiptConfigLoaded} />
                                    <Button title="Share as PDF" onPress={sharePdf} variant="outline" style={{ marginBottom: spacing.sm }} disabled={!receiptConfigLoaded} />
                                    <Button title="Skip" variant="outline" onPress={onClose} />
                                </>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    )
}

export default ShareReceiptModal

const $overlay: ThemedStyle<ViewStyle> = () => ({
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
})

const $box: ThemedStyle<ViewStyle> = ({ colors, spacing: sp }) => ({
    backgroundColor: colors.background, borderRadius: 20, padding: sp.lg, width: '100%', maxWidth: 340,
})

const styles = StyleSheet.create({
    captureContainer: {
        position: 'absolute',
        left: -10000,
        top: 0,
        width: 1080,
        height: 1520,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    webView: {
        width: 1080,
        height: 1520,
        backgroundColor: '#FFFFFF',
    },
})
