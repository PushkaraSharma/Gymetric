import { Image, Platform, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native'
import React, { useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import HeaderbackButton from '@/components/HeaderbackButton'
import { spacing } from '@/theme/spacing'
import { colors } from '@/theme/colors'
import { Button } from '@/components/Button'
import { Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { TextField } from '@/components/TextField'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectGymInfo, selectLoading, setGymInfo, setLoading } from '@/redux/state/GymStates'
import { ThemeProvider } from '@react-navigation/native'
import { ThemedStyle } from '@/theme/types'
import { useAppTheme } from '@/theme/context'
import { api } from '@/services/api'
import Toast from 'react-native-toast-message'
import { goBack } from '@/navigators/navigationUtilities'

type GymFormType = {
  name: string,
  ownerName: string,
  address: string,
  contactNumber: number,
  email: string
}

const BusinessProfile = () => {
  const { themed } = useAppTheme();
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectLoading);
  const gymDetails = useAppSelector(selectGymInfo);
  const [form, setForm] = useState<GymFormType>({ name: gymDetails?.name, ownerName: gymDetails?.ownerName, address: gymDetails?.address, contactNumber: gymDetails?.contactNumber, email: gymDetails?.email })

  const handleForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateGym = async () => {
    dispatch(setLoading({ loading: true }));
    const response = await api.updateGym({ id: gymDetails?._id, ...form });
    if (response.kind === 'ok') {
      dispatch(setGymInfo({ gymInfo: response.data }));
      Toast.show({ type: 'success', text1: 'Gym details updated successfully' });
      goBack();
    }
    dispatch(setLoading({ loading: false }));
  };

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[$styles.flex1]}
      safeAreaEdges={["bottom"]}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <Header title='Business Profile' backgroundColor='#fff' LeftActionComponent={<HeaderbackButton />} />
      <View style={{ paddingTop: 10, flex: 1 }}>
        <ScrollView style={{ paddingHorizontal: 15 }}>
          <View>
            <View style={[{ alignSelf: 'center', marginVertical: spacing.md, borderRadius: 60, padding: spacing.sm, backgroundColor: colors.tintInactive, borderWidth: 4, borderColor: '#fff' }, $styles.shadow]}>
              <Image source={require('../../../assets/images/app-icon.png')} style={{ width: 60, height: 60 }} />
            </View>
          </View>
          <TextField
            value={form.name}
            onChangeText={(val) => { handleForm('name', val) }}
            containerStyle={themed($textField)}
            autoCapitalize="words"
            autoCorrect={false}
            label="Gym Name"
            placeholder="Enter gym name"
            RightAccessory={() => <MaterialCommunityIcons name='dumbbell' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            value={form.contactNumber.toString()}
            onChangeText={(val) => { handleForm('contactNumber', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            keyboardType='number-pad'
            label="Phone Number"
            placeholder="Enter contact number"
            RightAccessory={() => <MaterialCommunityIcons name='phone' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            value={form.ownerName}
            onChangeText={(val) => { handleForm('ownerName', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            label="Owner"
            placeholder="Enter owner name"
            RightAccessory={() => <Octicons name='person' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            value={form.email}
            onChangeText={(val) => { handleForm('email', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            label="Email"
            placeholder="Enter email adress"
            RightAccessory={() => <MaterialCommunityIcons name='email' size={20} color={colors.tintInactive} style={{ alignSelf: 'center', marginRight: 10 }} />}
          />
          <TextField
            value={form.address}
            onChangeText={(val) => { handleForm('address', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            label="Location"
            multiline
            placeholder="Enter gym address"
            RightAccessory={() => <Ionicons name='location-sharp' size={20} color={colors.tintInactive} style={{ marginRight: 10, marginTop: 10 }} />}
          />
        </ScrollView>
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
          <Button text={loading ? 'Saving...' : 'Save Changes'} preset="reversed" LeftAccessory={() => <Ionicons name='save' size={20} color={colors.background} style={{ marginRight: 10 }} />} onPress={updateGym} />
        </View>
      </View>
    </Screen>
  )
}

export default BusinessProfile

const styles = StyleSheet.create({})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})
