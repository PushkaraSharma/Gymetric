import { Image, Platform, ScrollView, StyleSheet, Text, View, ViewStyle, TextInput } from 'react-native'
import React, { useRef, useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import HeaderbackButton from '@/components/HeaderbackButton'
import { Button } from '@/components/Button'
import { Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { TextField } from '@/components/TextField'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectGymInfo, selectLoading, setGymInfo, setLoading } from '@/redux/state/GymStates'
import { ThemedStyle } from '@/theme/types'
import { useAppTheme } from '@/theme/context'
import { api } from '@/services/Api'
import Toast from 'react-native-toast-message'
import { goBack } from '@/navigators/navigationUtilities'
import { useImagePicker } from '@/utils/useImagePicker'
import { Pressable } from 'react-native'

type GymFormType = {
  name: string,
  ownerName: string,
  address: string,
  contactNumber: number,
  email: string
}

const BusinessProfile = () => {
  const { theme: { colors, spacing, isDark }, themed } = useAppTheme();
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectLoading);
  const gymDetails = useAppSelector(selectGymInfo);
  const [form, setForm] = useState<GymFormType>({ name: gymDetails?.name, ownerName: gymDetails?.ownerName, address: gymDetails?.address, contactNumber: gymDetails?.contactNumber, email: gymDetails?.email })
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const { showImagePickerOptions } = useImagePicker();

  const phoneRef = useRef<any>(null);
  const ownerRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const addressRef = useRef<any>(null);

  const handleLogoUpdate = (uri: string) => {
    setSelectedLogo(uri);
  };

  const handleForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateGym = async () => {
    dispatch(setLoading({ loading: true }));

    // Upload logo first if selected
    let logoUrl = gymDetails?.logo;
    if (selectedLogo) {
      const uploadResponse = await api.uploadGymLogo(selectedLogo);
      if (uploadResponse.kind === 'ok') {
        logoUrl = uploadResponse.data.logo;
      } else {
        dispatch(setLoading({ loading: false }));
        return; // Stop if upload fails
      }
    }

    const response = await api.updateGym({ id: gymDetails?._id, ...form, logo: logoUrl });
    if (response.kind === 'ok') {
      dispatch(setGymInfo({ gymInfo: response.data }));
      Toast.show({ type: 'success', text1: 'Gym details updated successfully' });
      setSelectedLogo(null);
      goBack();
    }
    dispatch(setLoading({ loading: false }));
  };

  return (
    <Screen
      preset={Platform.OS === 'android' ? "auto" : 'fixed'}
      contentContainerStyle={[$styles.flex1]}
      safeAreaEdges={["bottom"]}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Header title='Business Profile' backgroundColor={colors.surface} leftIcon="caretLeft" onLeftPress={goBack} />
      <View style={{ flex: 1 }}>
        <ScrollView style={{ paddingHorizontal: 15 }}>
          <View>
            <Pressable
              onPress={() => showImagePickerOptions(handleLogoUpdate)}
              style={({ pressed }) => [{ alignSelf: 'center', opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[{ marginVertical: spacing.md, borderRadius: 60, backgroundColor: colors.surface, borderWidth: 4, borderColor: colors.border }, $styles.shadow]}>
                {selectedLogo || gymDetails?.logo ? (
                  <Image source={{ uri: selectedLogo || gymDetails?.logo }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                ) : (
                  <Image source={isDark ? require('@assets/images/app-icon-dark.png') : require('@assets/images/app-icon.png')} style={{ width: 100, height: 100, borderRadius: 50 }} />
                )}
                <View style={themed($cameraBadge)}>
                  <Ionicons name="camera" size={16} color={colors.background} />
                </View>
              </View>
            </Pressable>
          </View>
          <TextField
            value={form.name}
            onChangeText={(val) => { handleForm('name', val) }}
            containerStyle={themed($textField)}
            autoCapitalize="words"
            autoCorrect={false}
            label="Gym Name"
            placeholder="Enter gym name"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            RightAccessory={() => <MaterialCommunityIcons name='dumbbell' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            ref={phoneRef}
            value={form.contactNumber?.toString()}
            onChangeText={(val) => { handleForm('contactNumber', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            keyboardType='number-pad'
            label="Phone Number"
            placeholder="Enter contact number"
            returnKeyType="next"
            onSubmitEditing={() => ownerRef.current?.focus()}
            RightAccessory={() => <MaterialCommunityIcons name='phone' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            ref={ownerRef}
            value={form.ownerName}
            onChangeText={(val) => { handleForm('ownerName', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            label="Owner"
            placeholder="Enter owner name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            RightAccessory={() => <Octicons name='person' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            ref={emailRef}
            value={form.email}
            onChangeText={(val) => { handleForm('email', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            label="Email"
            placeholder="Enter email address"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => addressRef.current?.focus()}
            RightAccessory={() => <MaterialCommunityIcons name='email' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            ref={addressRef}
            value={form.address}
            onChangeText={(val) => { handleForm('address', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            label="Location"
            multiline
            placeholder="Enter gym address"
            returnKeyType="done"
            onSubmitEditing={updateGym}
            blurOnSubmit={true}
            RightAccessory={() => <Ionicons name='location-sharp' size={20} color={colors.tintInactive} style={{ marginRight: 10, marginTop: 10 }} />}
          />
        </ScrollView>
        <View style={themed($footer)}>
          <Button text={loading ? 'Saving...' : 'Save Changes'} preset="reversed" LeftAccessory={() => <Ionicons name='save' size={20} color={colors.white} style={{ marginRight: 10 }} />} onPress={updateGym} />
        </View>
      </View>
    </Screen>
  )
}

export default BusinessProfile

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderTopWidth: 1,
  padding: spacing.md,
  borderColor: colors.border,
})

const $cameraBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  bottom: 5,
  right: 5,
  backgroundColor: colors.primary,
  padding: 6,
  borderRadius: 15,
  borderWidth: 2,
  borderColor: colors.background,
})
