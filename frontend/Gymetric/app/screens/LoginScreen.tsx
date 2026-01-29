import { useRef, useState } from "react"
import { Image, ImageStyle, Pressable, TextInput, TextStyle, View, ViewStyle } from "react-native"
import { Button } from "@/components/Button"
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
import { Eye, EyeOff } from "lucide-react-native"
import Constants from 'expo-constants';
import { OTA_VERSION } from "@/utils/Constants"
import { MotiView } from "moti"

export const LoginScreen = () => {
  const { themed, theme: { colors } } = useAppTheme()
  const dispatch = useAppDispatch()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const passwordInput = useRef<TextInput>(null)

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await api.loginAPI(username, password)
      if (response.kind === "ok") {
        const token = response.data.token
        saveString("authToken", token);
        save("userData", response.data)
        api.setAuthToken(token)
        dispatch(setLoggedInUser(response.data))
      } else {
        setError("Invalid credentials. Please try again.")
      }
    } catch (e) {
      setError("Something went wrong. Please check your connection.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
      backgroundColor={colors.background}
    >
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 800 }}
        style={themed($loginCard)}
      >
        <View style={themed($logoContainer)}>
          <Image
            source={require('../../assets/images/app-icon.png')}
            resizeMode="contain"
            style={$logo}
          />
        </View>

        <View style={$headerTextContainer}>
          <Text preset="heading">Gymetric</Text>
          <Text
            preset="subheading"
            text="Welcome Back"
            style={themed($welcomeTitle)}
          />
          <Text
            preset="subheading"
            text="Login to manage your gym memberships"
            style={themed($welcomeSubtitle)}
          />
        </View>

        <View style={$formContainer}>
          <TextField
            value={username}
            onChangeText={setUsername}
            containerStyle={themed($textField)}
            label="Username"
            placeholder="Enter your username"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordInput.current?.focus()}
          />

          <TextField
            ref={passwordInput}
            value={password}
            onChangeText={setPassword}
            containerStyle={themed($textField)}
            label="Password"
            placeholder="Enter your password"
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            RightAccessory={() => (
              <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={{ paddingRight: 12 }}>
                {isPasswordVisible ? (
                  <EyeOff size={20} color={colors.textDim} />
                ) : (
                  <Eye size={20} color={colors.textDim} />
                )}
              </Pressable>
            )}
          />

          {error ? <Text style={{ color: colors.error, marginBottom: 16, textAlign: 'center' }} size="xs">{error}</Text> : null}

          <Button
            testID="login-button"
            text="Login"
            preset="dark"
            style={themed($tapButton)}
            onPress={handleLogin}
            disabled={isLoading}
          />
        </View>

        <View style={$footer}>
          <Text style={themed($versionText)}>
            v{Constants.expoConfig?.version} ({OTA_VERSION})
          </Text>
        </View>
      </MotiView>
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
  justifyContent: 'center',
})

const $loginCard: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.surface,
  padding: spacing.xl,
  borderRadius: 24,
  shadowColor: colors.palette.slate900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
})

const $logoContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  marginBottom: spacing.md,
  alignItems: 'center',
  justifyContent: 'center',
})

const $logo: ImageStyle = {
  width: 80,
  height: 80,
}

const $headerTextContainer: ViewStyle = {
  alignItems: 'center',
  marginBottom: 32,
}

const $welcomeTitle: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontFamily: typography.secondary.bold,
  marginVertical: 8,
})

const $welcomeSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: 'center',
})

const $formContainer: ViewStyle = {
  width: '100%',
}

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $footer: ViewStyle = {
  marginTop: 32,
  alignItems: 'center',
}

const $versionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
})
