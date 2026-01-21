import { Image, LayoutAnimation, Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import React, { useCallback } from 'react'
import { useAppTheme } from '@/theme/context';
import { ThemedStyle } from '@/theme/types';
import { useSafeAreaInsetsStyle } from '@/utils/useSafeAreaInsetsStyle';
import { Text } from '@/components/Text';
import { useAppSelector } from '@/redux/Hooks';
import { selectGymInfo } from '@/redux/state/GymStates';
import { colors } from '@/theme/colors';
import { MaterialIcons, Octicons } from '@expo/vector-icons';
import { load, remove } from '@/utils/LocalStorage';



const SideDrawer = () => {
    const $drawerInsets = useSafeAreaInsetsStyle(["top"]);
    const gymInfo = useAppSelector(selectGymInfo);
    const user: any = load('userData');
    const { setThemeContextOverride, themeContext, themed } = useAppTheme()

    const toggleTheme = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setThemeContextOverride(themeContext === "dark" ? "light" : "dark")
    }, [themeContext, setThemeContextOverride]);

    return (
        <View style={themed([$drawer, $drawerInsets])}>
            <View style={[styles.container]}>
                <View style={themed($customIconContainer)}>
                    <Image source={require('../../../assets/images/app-icon.png')} resizeMode="stretch" style={{ width: 50, height: 50 }} />
                </View>
                <View style={{ marginLeft: 15, width: '75%' }}>
                    <Text size='xl' weight='bold'>{gymInfo?.name}</Text>
                    <Text style={themed({ color: colors.textDim })} size='xs'>{gymInfo?.address ?? '123 Muscule way, Iron City, CA'}</Text>
                </View>
            </View>
            <View style={themed($staffView)}>
                <View style={{ borderRadius: 30, padding: 10, alignSelf: 'flex-start', backgroundColor: colors.palette.primary200, marginRight: 15 }}>
                    <Octicons name='person' size={35}  color={colors.tint}/>
                </View>
                <View>
                    <Text weight='medium' size='md'>{user?.username ?? "Test user"}</Text>
                    <View style={{ backgroundColor: colors.palette.primary200, alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, alignSelf: 'flex-start', marginTop: 5 }}>
                        <Text size='xxs' style={{ color: colors.tint, textTransform: 'capitalize' }}>{user?.role}</Text>
                    </View>
                </View>
            </View>
            <View style={{ flex: 1, padding: 20 }}>
                {/* <View style={$styles.flexRow}>
                    <Text style={{ marginLeft: 15 }} size='md'>Dark Mode</Text>
                    <Switch value={themeContext === 'dark'} onPress={toggleTheme} />
                </View> */}
            </View>
            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 20 }}>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => { remove('authToken') }}>
                    <MaterialIcons name='logout' size={30} color={colors.error} />
                    <Text style={{ marginLeft: 15, color: colors.error }} size='md' >Logout</Text>
                </Pressable>
                <Text style={{ color: colors.textDim, marginTop: 20, textAlign: 'center' }} size='xxs'>v1.2.8 • Gymetric Systems</Text>
            </View>
        </View>
    )
}

export default SideDrawer

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 25, borderColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20 }
})

const $drawer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.background,
    flex: 1,
})

const $customIconContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.palette.lightgray,
    padding: spacing.xxs,
    borderRadius: 10,
    alignSelf: 'center',
})

const $staffView: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.palette.lightgray, margin: 20, borderRadius: 10, flexDirection: 'row', alignItems: 'center', padding: 10
})



