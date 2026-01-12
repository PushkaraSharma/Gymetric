import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react"
import { TextInput, TextStyle, View, ViewStyle } from "react-native"
import { Button } from "@/components/Button"
import { Icon, PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { $styles } from "@/theme/styles"
import { api } from "@/services/api"
import { useMMKVString } from "react-native-mmkv"
import { saveString } from "@/utils/storage"

export const LoginScreen = () => {
  const authPasswordInput = useRef<TextInput>(null)

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
        saveString("authToken", res.data.token)
        setUsername("")
        setPassword("")
        return
      }
      setValidation({ type: "password", msg: res.message ?? "Invalid credentials" })
    } catch (e) {
      setValidation({ type: "password", msg: "Something went wrong. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const PasswordRightAccessory = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isAuthPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsAuthPasswordHidden(!isAuthPasswordHidden)}
          />
        )
      },
    [isAuthPasswordHidden, colors.palette.neutral800],
  )

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={$styles.card}>
        <Icon icon="ladybug" containerStyle={themed($customIconContainer)} />
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
          RightAccessory={PasswordRightAccessory}
          helper={validation.type === 'password' ? validation.msg : undefined}
        />
        <Button
          text="Tap to log in!"
          style={themed($tapButton)}
          preset="reversed"
          onPress={login}
          disabled={loading}
        />
      </View>
    </Screen>
  )
}

const $customIconContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.accent200,
  padding: spacing.md,
  borderRadius: 50,
  alignSelf: 'center'
})

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
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
