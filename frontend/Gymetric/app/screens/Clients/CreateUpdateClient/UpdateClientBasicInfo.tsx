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

import { differenceInYears, format } from 'date-fns';

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
    birthday: client?.birthday ? new Date(client.birthday) : null,
    anniversaryDate: client?.anniversaryDate ? new Date(client.anniversaryDate) : null,
    onboardingPurpose: client?.onboardingPurpose || '',
    gender: client?.gender,
    profilePicture: client?.profilePicture
  });
  const [datePicker, setDatePicker] = useState<ClientDateType>({ visible: false, type: 'birthday' });
  const [validNumber, setValidNumber] = useState<boolean>(true);

  const alreadyExists = (ph: string) => {
    return allClients?.some((item) => item.phoneNumber === ph);
  };

  const handleForm = (field: string, value: any) => {
    setForm(prev => {
      let updated = { ...prev, [field]: value };
      if (field === 'birthday' && value) {
        updated.age = differenceInYears(new Date(), value);
      }
      return updated;
    });
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

    const response = await api.updateClient({
      id: client?._id,
      ...form,
      profilePicture: profilePictureUrl,
      birthday: form.birthday ? format(form.birthday, 'yyyy-MM-dd') : null,
      anniversaryDate: form.anniversaryDate ? format(form.anniversaryDate, 'yyyy-MM-dd') : null,
    });
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
        isVisible={datePicker.visible}
        mode="date"
        date={datePicker.type === 'birthday' ? (form.birthday ?? new Date()) : (form.anniversaryDate ?? new Date())}
        onConfirm={async (date) => {
          handleForm(datePicker.type, date);
          setDatePicker({ visible: false, type: 'birthday' });
        }}
        onCancel={() => setDatePicker({ visible: false, type: 'birthday' })}
      />
      <Header title='Update Client' backgroundColor={colors.surface} leftIcon="caretLeft" onLeftPress={goBack} />
      <ScrollView style={{ paddingHorizontal: 15, flex: 1 }}>
        <PersonalInfo handleForm={handleForm} form={form} setDatePicker={setDatePicker} isUpdate validNumber={validNumber} />
      </ScrollView>
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
        <Button preset='reversed' disabled={(form?.phoneNumber.length !== 10) || !form.name || !validNumber} disabledStyle={{ opacity: 0.4 }} text={loading ? 'Updating...' : 'Update'} onPress={handleUpdate} />
      </View>
    </Screen>
  )
}

export default UpdateClientbasicInfo
