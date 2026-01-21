import { useMemo, useRef, useState } from "react"
import { Image, Pressable, TextInput, TextStyle, View, ViewStyle } from "react-native"
import { Button } from "@/components/Button"
import { PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { $styles } from "@/theme/styles"
import { api } from "@/services/Api"
import { useMMKVString } from "react-native-mmkv"
import { save, saveString } from "@/utils/LocalStorage"
import { useAppDispatch } from "@/redux/Hooks"
import { setLoggedInUser } from "@/redux/state/GymStates"
import { Octicons } from "@expo/vector-icons"
import Constants from 'expo-constants';
import { OTA_VERSION } from "@/utils/Constanst"

export const LoginScreen = () => {
  const authPasswordInput = useRef<TextInput>(null)
  const dispatch = useAppDispatch();

  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useMMKVString("username");
  const [password, setPassword] = useState("");
  const [validation, setValidation] = useState<{ type: 'username' | 'password' | null, msg: string }>({ type: null, msg: '' });

  const { themed, theme: { colors } } = useAppTheme()

  const login = async () => {
    setValidation({ type: null, msg: "" })
    if (!username) {
      setValidation({ type: "username", msg: "Username can't be blank" })
      return
    }
    if (!password) {
      setValidation({ type: "password", msg: "Password can't be blank" })
      return
    }
    try {
      setLoading(true)
      const res = await api.loginAPI(username, password)
      if (res.kind === "ok") {
        saveString("authToken", res.data.token);
        save("userData", res.data);
        api.setAuthToken(res.data.token)
        setUsername("");
        setPassword("");
        dispatch(setLoggedInUser({ loggedInUser: res.data }));
        return
      }
      setValidation({ type: "password", msg: res.message ?? "Invalid credentials" })
    } catch (e) {
      setValidation({ type: "password", msg: "Something went wrong. Please try again." })
    } finally {
      setLoading(false)
    }
  };

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top"]}
    >
      <View style={{ flex: 1, zIndex: 2 }}>
        <View style={$styles.card}>
          <View style={themed($customIconContainer)}>
            <Image source={require('../../assets/images/app-icon.png')} resizeMode="stretch" style={{ width: 70, height: 70 }} />
          </View>
          <Text tx="loginScreen:appName" preset="heading" style={themed($appName)} />
          <Text preset="subheading" style={themed($enterDetails)}>Welcome back, please login to continue</Text>
          <TextField
            status={validation.type === 'username' ? 'error' : undefined}
            value={username}
            onChangeText={setUsername}
            containerStyle={themed($textField)}
            autoCapitalize="none"
            autoCorrect={false}
            helper={validation.type === 'username' ? validation.msg : undefined}
            keyboardType="email-address"
            label="Username"
            placeholder="Enter your username"
            onSubmitEditing={() => authPasswordInput.current?.focus()}
          />
          <TextField
            status={validation.type === 'password' ? 'error' : undefined}
            ref={authPasswordInput}
            value={password}
            onChangeText={setPassword}
            containerStyle={themed($textField)}
            autoCapitalize="none"
            autoComplete="password"
            autoCorrect={false}
            secureTextEntry={isAuthPasswordHidden}
            label="Password"
            placeholder="Enter your password"
            onSubmitEditing={login}
            RightAccessory={(props) => 
            <Pressable onPress={() => setIsAuthPasswordHidden(!isAuthPasswordHidden)} style={props.style}>
            <Octicons name={isAuthPasswordHidden ? 'eye' : 'eye-closed'} size={20} color={colors.palette.neutral800}/>
          </Pressable>}
            helper={validation.type === 'password' ? validation.msg : undefined}
          />
          <Button
            text={loading ? "Logging in..." : "Tap to log in!"}
            style={themed($tapButton)}
            preset="reversed"
            onPress={login}
            disabled={loading}
          />
        </View>
        <Text style={{position: 'absolute', bottom: 0, width: '100%', textAlign: 'center', color: '#fff'}} size='xs' weight="semiBold">v{Constants.expoConfig?.version}({OTA_VERSION})</Text>
      </View>
      <Image source={require('../../assets/images/gymbg.png')} style={{ position: 'absolute', bottom: -20, opacity: 0.8 }} resizeMode='cover' />
    </Screen>
  )
}

const $customIconContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  padding: spacing.xs,
  borderRadius: 50,
  alignSelf: 'center',
})

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
  flex: 1,
  justifyContent: 'flex-start'
})

const $appName: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  alignSelf: 'center'
})

const $enterDetails: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})
