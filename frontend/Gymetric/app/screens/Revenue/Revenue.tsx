import { View, StyleSheet, ScrollView, ViewStyle, TextStyle, FlatList, Platform } from 'react-native'
import React, { useCallback, useState } from 'react'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import HeaderbackButton from '@/components/HeaderbackButton'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { Text } from '@/components/Text'
import { api } from '@/services/Api'
import { useFocusEffect } from '@react-navigation/native'
import { setLoading } from '@/redux/state/GymStates'
import { useAppDispatch } from '@/redux/Hooks'
import { TrendingUp, Wallet, CreditCard, Banknote, Smartphone, ArrowDownLeft } from 'lucide-react-native'
import { format } from 'date-fns'
import { MotiView } from 'moti'
import { $styles } from '@/theme/styles'
import { goBack } from '@/navigators/navigationUtilities'

const Revenue = () => {
    const { themed, theme: { colors, spacing, typography } } = useAppTheme();
    const dispatch = useAppDispatch();
    const [stats, setStats] = useState<any>(null);

    const loadData = async () => {
        dispatch(setLoading({ loading: true }));
        const response = await api.dashboardRevenue();
        if (response.kind === 'ok') {
            setStats(response.data);
        }
        dispatch(setLoading({ loading: false }));
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const maxRevenue = stats?.monthlyRevenue?.reduce((max: number, item: any) => Math.max(max, item.amount), 0) || 1;

    const PaymentIcon = ({ method }: { method: string }) => {
        switch (method) {
            case 'UPI': return <Smartphone size={20} color={colors.palette.indigo500} />;
            case 'Cash': return <Banknote size={20} color={colors.success} />;
            case 'Card': return <CreditCard size={20} color={colors.error} />;
            default: return <Wallet size={20} color={colors.primary} />;
        }
    }

    const RenderTransaction = ({ item }: any) => (
        <View style={themed($transactionItem)}>
            <View style={$transactionLeft}>
                <View style={[themed($iconBox), { backgroundColor: colors.palette.indigo100 }]}>
                    <ArrowDownLeft size={20} color={colors.palette.indigo600} />
                </View>
                <View>
                    <Text weight="semiBold" style={{ color: colors.text }}>{item.clientName}</Text>
                    <Text size="xs" style={{ color: colors.textDim }}>{format(new Date(item.date), 'dd MMM, hh:mm a')}</Text>
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text weight="bold" style={{ color: colors.success }}>+₹{item.amount}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text size="xxs" style={{ color: colors.textDim, marginRight: 4 }}>{item.method}</Text>
                    {/* <PaymentIcon method={item.method} /> */}
                </View>
            </View>
        </View>
    );

    return (
        <Screen
            preset="fixed"
            contentContainerStyle={[$styles.flex1]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <Header
                title="Revenue"
                leftIcon="caretLeft"
                onLeftPress={goBack}
                backgroundColor={colors.surface}
            />
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Monthly Trend Chart */}
                <Text preset="subheading" style={{ marginBottom: 15, marginTop: 10, color: colors.text }}>Last 6 Months Trend</Text>
                <View style={themed($chartContainer)}>
                    <View style={$chartRow}>
                        {stats?.monthlyRevenue?.map((item: any, index: number) => {
                            const heightPercentage = (item.amount / maxRevenue) * 75;
                            return (
                                <View key={index} style={$barWrapper}>
                                    <Text size="xxs" style={{ marginBottom: 5, color: colors.textDim }}>₹{(item.amount / 1000).toFixed(0)}k</Text>
                                    <View style={[themed($bar), { height: `${Math.max(heightPercentage, 2)}%` }]} />
                                    <Text size="xs" style={{ marginTop: 8, color: colors.textDim }}>{item.label}</Text>
                                </View>
                            )
                        })}
                        {(!stats?.monthlyRevenue || stats?.monthlyRevenue.length === 0) && (
                            <Text style={{ alignSelf: 'center', color: colors.textDim }}>No revenue data available</Text>
                        )}
                    </View>
                </View>

                {/* Payment Methods */}
                <Text preset="subheading" style={{ marginBottom: 15, marginTop: 25, color: colors.text }}>Payment Methods (This Month)</Text>
                <View style={$methodsGrid}>
                    {stats?.paymentMethods?.map((item: any, index: number) => (
                        <View key={index} style={themed($methodCard)}>
                            <View style={$methodHeader}>
                                <PaymentIcon method={item.method} />
                                <Text weight="bold" size="lg" style={{ color: colors.text }}>{item.count}</Text>
                            </View>
                            <Text size="xs" style={{ color: colors.textDim, marginTop: 5 }}>{item.method}</Text>
                            <Text weight="bold" size="md" style={{ color: colors.text, marginTop: 2 }}>₹{item.amount}</Text>
                        </View>
                    ))}
                    {(!stats?.paymentMethods || stats?.paymentMethods.length === 0) && (
                        <Text style={{ color: colors.textDim }}>No payments recorded this month</Text>
                    )}
                </View>

                {/* Recent Transactions */}
                <Text preset="subheading" style={{ marginBottom: 15, marginTop: 25, color: colors.text }}>Recent Transactions</Text>
                <View>
                    {stats?.recentTransactions?.map((item: any, index: number) => (
                        <RenderTransaction key={index} item={item} />
                    ))}
                    {(!stats?.recentTransactions || stats?.recentTransactions.length === 0) && (
                        <Text style={{ color: colors.textDim }}>No recent transactions</Text>
                    )}
                </View>

            </ScrollView>
        </Screen>
    )
}

export default Revenue

const $chartContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    height: 220,
    justifyContent: 'flex-end'
})

const $chartRow: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    width: '100%'
}

const $barWrapper: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    flex: 1,
}

const $bar: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 12,
    backgroundColor: colors.primary,
    borderRadius: 6,
    minHeight: 4,
})

const $methodsGrid: ViewStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
}

const $methodCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    width: '48%',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
})

const $methodHeader: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
}

const $transactionItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
})

const $transactionLeft: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
}

const $iconBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
})
