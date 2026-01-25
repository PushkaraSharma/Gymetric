import { Image, Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import React, { useState } from 'react'
import { Screen } from '@/components/Screen'
import { $styles } from '@/theme/styles'
import { Header } from '@/components/Header'
import HeaderbackButton from '@/components/HeaderbackButton'
import { spacing } from '@/theme/spacing'
import { colors } from '@/theme/colors'
import { Button } from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'
import { TextField } from '@/components/TextField'
import { useAppDispatch, useAppSelector } from '@/redux/Hooks'
import { selectLoading, setGymInfo, setLoading } from '@/redux/state/GymStates'
import { ThemedStyle } from '@/theme/types'
import { useAppTheme } from '@/theme/context'
import { api } from '@/services/Api'
import Toast from 'react-native-toast-message'
import { goBack } from '@/navigators/navigationUtilities'
import { Switch } from '@/components/Toggle/Switch'
import { Checkbox } from '@/components/Toggle/Checkbox'
import { Text } from '@/components/Text'
import { Radio } from '@/components/Toggle/Radio'

type MembershipType = {
  planName: string,
  description: string,
  price: number,
  isTrial: boolean,
  active: boolean,
  planType: 'indivisual' | 'couple' | 'group',
  membersAllowed: number,
  index: number
}

const CreateEditMembership = ({ navigation, route }: any) => {
  const { themed } = useAppTheme();
  const dispatch = useAppDispatch();
  const membership = route?.params?.membership;
  const loading = useAppSelector(selectLoading);
  const [form, setForm] = useState<MembershipType>({ planName: membership?.planName ?? '', description: membership?.description ?? '', price: Number(membership?.price ?? 0), isTrial: membership?.isTrial ?? false, active: membership?.active ?? true, planType: membership?.planType ?? 'indivisual', membersAllowed: membership?.membersAllowed ?? 1, index: membership?.index ?? 0 });
  const [duration, setDuration] = useState<string>((membership?.durationInDays || membership?.durationInMonths || 0).toString());
  const [durationType, setDurationType] = useState<'Months' | 'Days'>(membership?.durationInDays ? 'Days' : 'Months');

  const handleForm = (field: string, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'planType' && value !== 'group') {
        updated.membersAllowed = value === 'individual' ? 1 : 2;
      }
      return updated;
    });
  };
  const validate = () => {
    let msg = '';
    if (!form.planName) msg = 'Please enter name of membership';
    else if (Number(duration) === 0) msg = 'Please enter duration of membership';
    else if (form.planType === 'group' && form.membersAllowed <= 1) msg = 'Please enter more than 1 person for group plan';
    if (msg) {
      Toast.show({ type: 'error', text1: msg });
      return false;
    }
    return true;

  }

  const createOrUpdate = async () => {
    if (!validate()) return;
    const body: any = { ...form, durationInDays: durationType === 'Days' ? Number(duration) : 0, durationInMonths: durationType === 'Months' ? Number(duration) : 0 };
    if (membership) body['id'] = membership?._id;
    dispatch(setLoading({ loading: true }));
    const response = membership ? await api.updateMembership(body) : await api.createMembership(body);
    if (response.kind === 'ok') {
      dispatch(setGymInfo({ gymInfo: response.data }));
      Toast.show({ type: 'success', text1: `Membership ${membership ? 'updated' : 'created'} successfully` });
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
      <Header title={`${membership ? 'Update' : 'Create'} Membership`} backgroundColor='#fff' LeftActionComponent={<HeaderbackButton />} />
      <View style={{ flex: 1 }}>
        <ScrollView style={{ paddingHorizontal: 15, paddingTop: 10 }}>
          <TextField
            value={form.planName}
            onChangeText={(val) => { handleForm('planName', val) }}
            containerStyle={themed($textField)}
            autoCapitalize="words"
            autoCorrect={false}
            label="Plan Name"
            placeholder="Membership Name (e.g. Pro Annual)"
          />
          <TextField
            value={form.description}
            onChangeText={(val) => { handleForm('description', val) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            placeholder="Description (Optional)"
            multiline
          />
          <View style={{ marginBottom: 20 }}>
            <Text preset='formLabel'>Plan Type</Text>
            <View style={[$styles.flexRow, { marginTop: 10 }]}>
              {
                ['Indivisual', 'Couple', 'Group'].map((type: string, index: number) => (
                  <Pressable key={index} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => { handleForm('planType', type.toLowerCase()) }}>
                    <Radio value={form.planType === type?.toLowerCase()} onValueChange={(val) => { val && handleForm('planType', type.toLowerCase()) }} />
                    <Text style={{ marginLeft: 5 }}>{type}</Text>
                  </Pressable>
                ))
              }
            </View>
            {form.planType === 'group' &&
              <TextField
                value={form.membersAllowed.toString()}
                onChangeText={(val) => { handleForm('membersAllowed', Number(val)) }}
                containerStyle={[{ marginTop: 15 }]}
                autoCorrect={false}
                keyboardType='number-pad'
                placeholder="Enter maximum allowed members"
              />
            }
          </View>
          <TextField
            value={form.price.toString()}
            onChangeText={(val) => { handleForm('price', Number(val)) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            keyboardType='number-pad'
            label="Price & Status"
            placeholder="0.00"
            LeftAccessory={() => <Text style={{ alignSelf: 'center', marginLeft: 15, color: colors.textDim }} size='md'>₹</Text>}
          />
          <View style={[$styles.card, { padding: spacing.md, marginTop: 0, paddingHorizontal: 0, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
            <View style={[$styles.flexRow, { paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, borderColor: colors.border }]}>
              <Text>Is it a Trial ?</Text>
              <Switch value={form.isTrial} onPress={() => handleForm('isTrial', !form.isTrial)} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: 10 }}>
              <Checkbox value={form.active} onPress={() => { handleForm('active', !form.active) }} />
              <Text style={{ marginLeft: 15 }}>Active Status</Text>
            </View>
          </View>
          <View style={{ marginTop: 5, marginBottom: 15 }}>
            <Text preset='formLabel'>Duration Settings</Text>
            <View style={[$styles.flexRow, { marginTop: 10, backgroundColor: colors.palette.neutral100, padding: 4, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
              {['Months', 'Days'].map((type: string, index: number) => (
                <Pressable key={index} style={{ width: '48%', alignItems: 'center', padding: 8, backgroundColor: type === durationType ? colors.tint : colors.palette.neutral100, borderRadius: 5 }} onPress={() => { setDurationType(type as 'Months') }}>
                  <Text weight='medium' style={{ color: type === durationType ? colors.palette.neutral100 : colors.textDim }}>{type}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TextField
            value={duration}
            onChangeText={setDuration}
            containerStyle={themed($textField)}
            autoCorrect={false}
            keyboardType='number-pad'
            placeholder="Enter duration length (e.g. 12)"
          />
            <TextField
            label='Order Index'
            value={form.index.toString()}
            onChangeText={(val) => { handleForm('index', Number(val)) }}
            containerStyle={themed($textField)}
            autoCorrect={false}
            keyboardType='number-pad'
            placeholder="Enter index for sort order"
          />
        </ScrollView>
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
          <Button text={loading ? `${membership ? 'Updating...' : 'Creating'}` : `${membership ? 'Update' : 'Create'} Membership`} preset="reversed" LeftAccessory={() => <Ionicons name='save' size={20} color={colors.background} style={{ marginRight: 10 }} />} onPress={createOrUpdate} />
        </View>
      </View>
    </Screen>
  )
}

export default CreateEditMembership

const styles = StyleSheet.create({})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})