import { Pressable, View, ViewStyle } from 'react-native'
import React, { FC } from 'react'
import { Text } from '@/components/Text'
import { $styles } from '@/theme/styles'
import { useAppDispatch } from '@/redux/Hooks'
import { colors } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { formatDate } from 'date-fns'
import { TextField } from '@/components/TextField'
import { ClientDateType, ClientFormType } from '@/utils/types'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'

type Props = {
    handleForm: (field: string, value: any) => void,
    form: ClientFormType,
    setDatePicker: (val: ClientDateType) => void,
    isUpdate?: boolean
}

const PersonalInfo: FC<Props> = ({ handleForm, form, setDatePicker, isUpdate }) => {
    const { themed } = useAppTheme();

    return (
        <View style={{ marginTop: 15 }}>
            <Text preset='heading'>Personal Details</Text>
            <Text weight='light'>Please {isUpdate ? 'update' : 'enter'} client's basic information.</Text>
            <View style={{ marginTop: 20 }}>
                <TextField
                    value={form.name}
                    onChangeText={(val) => { handleForm('name', val) }}
                    containerStyle={themed($textField)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    label="Full Name"
                    placeholder="e.g. John Doe"
                />
                <TextField
                    value={form.phoneNumber}
                    onChangeText={(val) => { handleForm('phoneNumber', val) }}
                    containerStyle={themed($textField)}
                    keyboardType='number-pad'
                    autoCorrect={false}
                    label="Phone Number"
                    placeholder="Enter phone number"
                />
                <View style={[$styles.flexRow, { alignItems: 'baseline' }]}>
                    <TextField
                        value={form.age?.toString()}
                        onChangeText={(val) => { handleForm('age', val ? Number(val) : null) }}
                        containerStyle={[themed($textField), { width: '30%' }]}
                        keyboardType='number-pad'
                        autoCorrect={false}
                        label="Age"
                        placeholder="Enter age"
                    />
                    <View style={{ width: '60%' }}>
                        <Text weight='medium'>Birthday</Text>
                        <Pressable style={themed($dateView)} onPress={() => { setDatePicker({ visible: true, type: 'birthday' }) }}>
                            <Text style={{ color: form.birthday ? '#000' : colors.textDim }}>{form.birthday ? formatDate(form.birthday, 'dd/MM/yyyy') : 'dd/mm/yyyy'}</Text>
                            <Ionicons name='calendar-outline' size={20} color={colors.textDim} />
                        </Pressable>
                    </View>
                </View>
                <View>
                    <Text weight='medium'>Gender</Text>
                    <View style={[$styles.flexRow, { backgroundColor: colors.tintInactive, padding: 4, borderRadius: 10, marginTop: 8 }]}>
                        {
                            ['Male', 'Female', 'Other'].map((gender: string, index: number) => {
                                const selected = form.gender === gender;
                                return (
                                    <Pressable key={index} style={{ backgroundColor: selected ? colors.background : colors.tintInactive, width: '30%', alignItems: 'center', padding: 10, borderRadius: 10 }} onPress={() => { handleForm('gender', gender) }}>
                                        <Text weight={selected ? 'medium' : 'normal'} style={{ color: selected ? colors.tint : colors.text }}>{gender}</Text>
                                    </Pressable>
                                )
                            })
                        }
                    </View>
                </View>
            </View>
        </View>
    )
}

export default PersonalInfo

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    marginBottom: spacing.lg,
})

const $dateView: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.palette.neutral400, borderRadius: 5
})