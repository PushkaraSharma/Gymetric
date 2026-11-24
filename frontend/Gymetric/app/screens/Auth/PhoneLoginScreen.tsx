import React, { useState } from "react"
import { View, ActivityIndicator, Image, Keyboard, StyleSheet, Text, ScrollView, Platform } from "react-native"
import { Screen } from "@/components/Screen"
import { TextField } from "@/components/TextField"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useNavigation } from "@react-navigation/native"
import { api } from "@/services/Api"
import { storage } from "@/utils/LocalStorage"
import { VersionFooter } from "@/components/VersionFooter";

type StaffMatch = {
    phone: string
    formatted: string
    username?: string
    roleName?: string
    gymName?: string
    hasPassword: boolean
    isActive: boolean
}

export const PhoneLoginScreen = () => {
    const { theme, isDark } = useAppTheme()
    const styles = getStyles(theme)
    const navigation = useNavigation<any>()
    const [phoneNumber, setPhoneNumber] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [staffMatch, setStaffMatch] = useState<StaffMatch | null>(null)

    React.useEffect(() => {
        const auth = getAuth();
        if (auth.currentUser) {
            auth.signOut().catch(console.error);
        }
    }, []);

    const handleContinue = async (phone?: string) => {
        const phoneInput = phone || phoneNumber
        const phoneToUse = phoneInput.replace(/\s/g, '')

        if (!phoneToUse || phoneToUse.length < 10) {
            setError("Please enter a valid phone number")
            return
        }

        setIsLoading(true)
        setError("")
        storage.set("isFirstLaunch", false)

        try {
            const formattedNumber = phoneToUse.startsWith('+') ? phoneToUse : `+91${phoneToUse}`;
            const check = await api.checkUser(formattedNumber);
            if (check.kind === 'ok' && check.data.exists && check.data.isStaff) {
                setStaffMatch({
                    phone: phoneToUse,
                    formatted: formattedNumber,
                    username: check.data.username,
                    roleName: check.data.roleName,
                    gymName: check.data.gymName,
                    hasPassword: !!check.data.hasPassword,
                    isActive: check.data.isActive !== false,
                })
            } else if (check.kind === 'ok' && check.data.exists && check.data.hasPassword) {
                navigation.navigate("PasswordLogin", {
                    phoneNumber: phoneToUse,
                    username: check.data.username
                });
            } else {
                await sendOtp(formattedNumber)
            }
        } catch (e: any) {
            console.error(e);
            setError("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const sendOtp = async (formattedNumber: string) => {
        const confirmation = await signInWithPhoneNumber(getAuth(), formattedNumber);
        navigation.navigate("OTPVerification", { confirmation, phoneNumber: formattedNumber });
    }

    const joinGym = async () => {
        if (!staffMatch) return
        if (staffMatch.hasPassword) {
            navigation.navigate("PasswordLogin", { phoneNumber: staffMatch.phone, username: staffMatch.username })
            return
        }
        setIsLoading(true)
        try {
            await sendOtp(staffMatch.formatted)
        } catch (e) {
            console.error(e)
            setError("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    if (staffMatch) {
        return (
            <Screen preset="fixed" safeAreaEdges={["top", "bottom"]}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.logoContainer}>
                        <Image source={isDark ? require("../../../assets/images/app-icon-dark.png") : require("../../../assets/images/app-icon.png")} style={styles.logo} />
                    </View>
                    <Text style={styles.title}>{staffMatch.username ? `Hi ${staffMatch.username.split(" ")[0]}` : "Welcome"}</Text>
                    <View style={styles.inviteCard}>
                        <Text style={styles.inviteLabel}>You are added as</Text>
                        <Text style={styles.inviteRole}>{staffMatch.roleName || "Staff"}</Text>
                        <Text style={styles.inviteLabel}>at</Text>
                        <Text style={styles.inviteGym}>{staffMatch.gymName}</Text>
                    </View>
                    {staffMatch.isActive ? null : (
                        <Text style={styles.errorText}>Your access is turned off. Contact the gym owner.</Text>
                    )}
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <Button
                        title={isLoading ? "Please wait..." : `Log in to ${staffMatch.gymName ?? "the gym"}`}
                        variant="primary"
                        onPress={joinGym}
                        disabled={isLoading || !staffMatch.isActive}
                        icon={isLoading ? <ActivityIndicator size="small" color="white" /> : undefined}
                    />
                    <Text style={styles.ownGymNote}>
                        Want to set up your own gym? Use a different phone number.
                    </Text>
                    <Text style={styles.changeNumber} onPress={() => { setStaffMatch(null); setPhoneNumber(""); setError("") }}>
                        Use a different number
                    </Text>
                </ScrollView>
                <VersionFooter />
            </Screen>
        )
    }

    return (
        <Screen
            preset="fixed"
            safeAreaEdges={["top", "bottom"]}
            {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.logoContainer}>
                    <Image source={isDark ? require("../../../assets/images/app-icon-dark.png") : require("../../../assets/images/app-icon.png")} style={styles.logo} />
                </View>
                <Text style={styles.title}>
                    {storage.getBoolean("isFirstLaunch") ? "Let's Get Started!" : "What's your number?"}
                </Text>
                <Text style={styles.subtitle}>
                    {storage.getBoolean("isFirstLaunch") ? "Enter your phone number to continue." : "We'll check if you have an account."}
                </Text>
                <TextField
                    value={phoneNumber}
                    onChangeText={(text) => {
                        setPhoneNumber(text)
                        if (text.length === 10) {
                            Keyboard.dismiss()
                            setTimeout(() => handleContinue(text), 100)
                        }
                    }}
                    label="Phone Number"
                    placeholder="9999999999"
                    placeholderTextColor={theme.colors.palette.slate400}
                    keyboardType="phone-pad"
                    autoFocus
                    containerStyle={{ marginBottom: theme.spacing.lg }}
                    LeftAccessory={() => <Text style={{ paddingLeft: 12, color: theme.colors.palette.slate400, fontSize: theme.typography.m }}>+91</Text>}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                    title={isLoading ? "Please wait..." : "Continue"}
                    variant="primary"
                    onPress={() => handleContinue()}
                    disabled={isLoading}
                    style={{ marginTop: theme.spacing.md }}
                    icon={isLoading ? <ActivityIndicator size="small" color="white" /> : undefined}
                />
            </ScrollView>
            <VersionFooter />
        </Screen>
    )
}

const getStyles = (theme: any) => StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 80,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 16,
    },
    title: {
        fontSize: theme.typography.xxl,
        fontWeight: theme.typography.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.typography.m,
        color: theme.colors.textDim,
        marginBottom: theme.spacing.xl,
    },
    errorText: {
        color: theme.colors.error,
        marginBottom: theme.spacing.md,
    },
    inviteCard: {
        backgroundColor: theme.colors.primaryBackground,
        borderRadius: 16,
        padding: theme.spacing.lg,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    inviteLabel: {
        fontSize: theme.typography.s,
        color: theme.colors.textDim,
    },
    inviteRole: {
        fontSize: theme.typography.xl,
        fontWeight: theme.typography.bold,
        color: theme.colors.primary,
        marginVertical: theme.spacing.xxs,
    },
    inviteGym: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.text,
        marginTop: theme.spacing.xxs,
        textAlign: 'center',
    },
    ownGymNote: {
        fontSize: theme.typography.xs,
        color: theme.colors.textDim,
        textAlign: 'center',
        marginTop: theme.spacing.lg,
    },
    changeNumber: {
        fontSize: theme.typography.s,
        color: theme.colors.primary,
        fontWeight: theme.typography.semiBold,
        textAlign: 'center',
        marginTop: theme.spacing.md,
    },
});
