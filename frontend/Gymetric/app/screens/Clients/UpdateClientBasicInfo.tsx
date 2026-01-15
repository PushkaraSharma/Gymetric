import { Platform, StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { ClientDateType, ClientFormType } from '@/utils/types';
import PersonalInfo from './ClientDetails/PersonalInfo';
import { Screen } from '@/components/Screen';
import { $styles } from '@/theme/styles';
import { Header } from '@/components/Header';
import HeaderbackButton from '@/components/HeaderbackButton';
import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';
import { useAppDispatch, useAppSelector } from '@/redux/Hooks';
import { selectLoading, setLoading } from '@/redux/state/GymStates';
import { api } from '@/services/api';
import Toast from 'react-native-toast-message';
import { goBack } from '@/navigators/navigationUtilities';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const UpdateClientbasicInfo = ({ navigation, route }: any) => {
  const client = route?.params?.client;
  const loading = useAppSelector(selectLoading);
  const dispatch = useAppDispatch();
  const [form, setForm] = useState<ClientFormType>({ name: client?.name, phoneNumber: client?.phoneNumber, age: client?.age, birthday: client?.birthday, gender: client?.gender });
  const [datePicker, setDatePicker] = useState<ClientDateType>({ visible: false, type: 'startDate' });

  const handleForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    dispatch(setLoading({ loading: true }));
    const response = await api.updateClient({ id: client?._id, ...form });
    if (response) {
      Toast.show({ type: 'success', text1: 'Client details updated successfully' });
      goBack();
    }
    dispatch(setLoading({ loading: false }));
  };

  return (
    <Screen
      preset="auto"
      contentContainerStyle={[$styles.flex1]}
      safeAreaEdges={["bottom"]}
      {...(Platform.OS === "android" ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}
    >
      <DateTimePickerModal
        isVisible={datePicker.visible}
        mode="date"
        date={datePicker.type === 'birthday' ? new Date() : form.startDate ?? new Date()}
        onConfirm={async (date) => {
          handleForm(datePicker.type, date);
          setDatePicker({ visible: false, type: 'startDate' });
        }}
        onCancel={() => setDatePicker({ visible: false, type: 'startDate' })}
      />
      <Header title='Update Client' backgroundColor='#fff' LeftActionComponent={<HeaderbackButton />} />
      <View style={{ paddingHorizontal: 15, flex: 1 }}>
        <PersonalInfo handleForm={handleForm} form={form} setDatePicker={setDatePicker} isUpdate />
      </View>
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, padding: 15, borderColor: colors.border }}>
        <Button preset='reversed' disabled={!form?.phoneNumber || !form.name} disabledStyle={{ opacity: 0.4 }} text={loading ? 'Updating...' : 'Update'} onPress={handleUpdate} />
      </View>
    </Screen>
  )
}

export default UpdateClientbasicInfo
