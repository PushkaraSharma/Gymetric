import { Platform, ScrollView, StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { ClientDateType, ClientDetailsType } from '@/utils/types';
import PersonalInfo from './PersonalInfo';
import { Screen } from '@/components/Screen';
import { $styles } from '@/theme/styles';
import { Header } from '@/components/Header';
import HeaderbackButton from '@/components/HeaderbackButton';
import { Button } from '@/components/Button';
import { useAppTheme } from '@/theme/context';
import { useAppDispatch, useAppSelector } from '@/redux/Hooks';
import { selectAllClients, selectLoading, setLoading } from '@/redux/state/GymStates';
import { api } from '@/services/Api';
import Toast from 'react-native-toast-message';
import { goBack } from '@/navigators/navigationUtilities';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const UpdateClientbasicInfo = ({ route }: any) => {
  const { theme: { colors } } = useAppTheme();
  const client = route?.params?.client;
  const loading = useAppSelector(selectLoading);
  const dispatch = useAppDispatch();
  const allClients = useAppSelector(selectAllClients)?.filter((item) => item.phoneNumber !== client?.phoneNumber);
  const [form, setForm] = useState<ClientDetailsType>({
    name: client?.name,
    phoneNumber: client?.phoneNumber,
    age: client?.age,
    birthday: client?.birthday,
    gender: client?.gender,
    profilePicture: client?.profilePicture
  });
  const [datePicker, setDatePicker] = useState<boolean>(false);
  const [validNumber, setValidNumber] = useState<boolean>(true);

  const alreadyExists = (ph: string) => {
    return allClients?.some((item) => item.phoneNumber === ph);
  };

  const handleForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'phoneNumber' && value.length === 10 && alreadyExists(value)) {
      setValidNumber(false);
    } else {
      setValidNumber(true);
    }
  };

  const handleUpdate = async () => {
    dispatch(setLoading({ loading: true }));

    // Upload profile picture first if it's a new local URI (starts with file:// or contains /cache/)
    // Simple check: if it's a cloudinary URL it won't be a local path
    let profilePictureUrl = form.profilePicture;
    if (form.profilePicture && (form.profilePicture.startsWith('file://') || form.profilePicture.includes('ImageData') || form.profilePicture.includes('ImagePicker'))) {
      const uploadResponse = await api.uploadClientProfilePicture(client._id, form.profilePicture);
      if (uploadResponse.kind === 'ok') {
        profilePictureUrl = uploadResponse.data.profilePicture;
      }
    }

    const response = await api.updateClient({ id: client?._id, ...form, profilePicture: profilePictureUrl });
    if (response) {
      Toast.show({ type: 'success', text1: 'Client details updated successfully' });
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
      <DateTimePickerModal
        isVisible={datePicker}
        mode="date"
        date={form.birthday ?? new Date()}
        onConfirm={async (date) => {
          handleForm('birthday', date);
          setDatePicker(false);
        }}
        onCancel={() => setDatePicker(false)}
      />
      <Header title='Update Client' backgroundColor={colors.surface} LeftActionComponent={<HeaderbackButton />} />
      <ScrollView style={{ paddingHorizontal: 15, flex: 1 }}>
        <PersonalInfo handleForm={handleForm} form={form} setDatePicker={(val) => { setDatePicker(true) }} isUpdate validNumber={validNumber} />
      </ScrollView>
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
        <Button preset='reversed' disabled={(form?.phoneNumber.length !== 10) || !form.name || !validNumber} disabledStyle={{ opacity: 0.4 }} text={loading ? 'Updating...' : 'Update'} onPress={handleUpdate} />
      </View>
    </Screen>
  )
}

export default UpdateClientbasicInfo
