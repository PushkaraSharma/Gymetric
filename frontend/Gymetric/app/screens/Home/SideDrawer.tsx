import { Image, LayoutAnimation, Pressable, StyleSheet, View, ViewStyle, TextStyle, ImageStyle } from 'react-native'
import React, { useCallback } from 'react'
import { useAppTheme } from '@/theme/context';
import { ThemedStyle } from '@/theme/types';
import { useSafeAreaInsetsStyle } from '@/utils/useSafeAreaInsetsStyle';
import { Text } from '@/components/Text';
import { useAppSelector } from '@/redux/Hooks';
import { selectGymInfo } from '@/redux/state/GymStates';
import { LogOut, User, Moon, Sun, MapPin } from 'lucide-react-native';
import { load, remove } from '@/utils/LocalStorage';
import { OTA_VERSION } from '@/utils/Constants';
import Constants from 'expo-constants';
import { $styles } from '@/theme/styles';
import { spacing } from '@/theme/spacing';
import { api } from '@/services/Api';

const SideDrawer = () => {
    const $drawerInsets = useSafeAreaInsetsStyle(["top", "bottom"]);
    const gymInfo = useAppSelector(selectGymInfo);
    const user: any = load('userData');
    const { setThemeContextOverride, themeContext, themed, theme: { colors, spacing, typography, isDark } } = useAppTheme()

    const toggleTheme = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setThemeContextOverride(themeContext === "dark" ? "light" : "dark")
    }, [themeContext, setThemeContextOverride]);

    return (
        <View style={themed([$drawer, $drawerInsets])}>
            <View style={themed($header)}>
                <View style={themed($logoContainer)}>
                    {gymInfo?.logo ? (
                        <Image source={{ uri: gymInfo.logo }} resizeMode="cover" style={$logo} />
                    ) : (
                        <Image source={isDark ? require('@assets/images/app-icon-dark.png') : require('@assets/images/app-icon.png')} resizeMode="contain" style={$logo} />
                    )}
                </View>
                <View style={$headerText}>
                    <Text style={themed($gymName)}>{gymInfo?.name || 'Gymetric'}</Text>
                    <View style={$addressContainer}>
                        <MapPin size={12} color={colors.textDim} />
                        <Text style={themed($gymAddress)} numberOfLines={1}>{gymInfo?.address || '--'}</Text>
                    </View>
                </View>
            </View>

            <View style={themed($userProfile)}>
                <View style={themed($avatarContainer)}>
                    <User size={28} color={colors.primary} />
                </View>
                <View style={$userInfo}>
                    <Text style={themed($username)}>{user?.username || '--'}</Text>
                    <View style={themed($roleBadge)}>
                        <Text style={themed($roleText)}>{user?.role || '--'}</Text>
                    </View>
                </View>
            </View>

            <View style={$menuContainer}>
                <Pressable style={themed($menuItem)} onPress={toggleTheme}>
                    <View style={themed($menuIconContainer)}>
                        {themeContext === 'dark' ? <Sun size={20} color={colors.primary} /> : <Moon size={20} color={colors.primary} />}
                    </View>
                    <Text style={themed($menuText)}>{themeContext === 'dark' ? 'Light Mode' : 'Dark Mode'}</Text>
                </Pressable>
            </View>

            <View style={themed($footer)}>
                <Pressable
                    style={[$styles.flexRow, $logoutBtn]}
                    onPress={() => {
                        remove('authToken');
                        api.setAuthToken(undefined);
                    }}
                >
                    <LogOut size={20} color={colors.error} />
                    <Text style={themed($logoutText)}>Logout</Text>
                </Pressable>
                <Text style={themed($versionText)}>
                    v{Constants.expoConfig?.version} ({OTA_VERSION})
                </Text>
            </View>
        </View>
    )
}

export default SideDrawer

const $drawer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.background,
    flex: 1,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
})

const $logoContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 65,
    height: 65,
    borderRadius: 65,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
})

const $logo: ImageStyle = {
    width: '100%',
    height: '100%',
}

const $headerText: ViewStyle = {
    marginLeft: 16,
    flex: 1,
}

const $gymName: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
    fontFamily: typography.secondary.bold,
    fontSize: 18,
    color: colors.text,
})

const $addressContainer: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
}

const $gymAddress: ThemedStyle<TextStyle> = ({ colors }) => ({
    fontSize: 12,
    color: colors.textDim,
    marginLeft: 4,
})

const $userProfile: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    margin: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
})

const $avatarContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
})

const $userInfo: ViewStyle = {
    marginLeft: 12,
}

const $username: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
    fontFamily: typography.primary.semiBold,
    fontSize: 16,
    color: colors.text,
})

const $roleBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.primaryBackground,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
})

const $roleText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    fontSize: 10,
    color: colors.primary,
    fontFamily: typography.primary.bold,
    textTransform: 'uppercase',
})

const $menuContainer: ViewStyle = {
    flex: 1,
    paddingHorizontal: spacing.xl,
}

const $menuItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
})

const $menuIconContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
})

const $menuText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    fontSize: 16,
    color: colors.text,
    fontFamily: typography.primary.medium,
})

const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    padding: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
})

const $logoutBtn: ViewStyle = {
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'flex-start'
}

const $logoutText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
    marginLeft: 12,
    color: colors.error,
    fontSize: 16,
    fontFamily: typography.primary.semiBold,
})

const $versionText: ThemedStyle<TextStyle> = ({ colors }) => ({
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 10,
})
