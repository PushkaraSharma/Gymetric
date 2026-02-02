import { Pressable, View, ViewStyle, Image, ImageStyle, TextInput } from 'react-native'
import React, { FC, useRef } from 'react'
import { Text } from '@/components/Text'
import { $styles } from '@/theme/styles'
import { Ionicons } from '@expo/vector-icons'
import { formatDate } from 'date-fns'
import { TextField } from '@/components/TextField'
import { ClientDateType, ClientDetailsType } from '@/utils/types'
import { useAppTheme } from '@/theme/context'
import { ThemedStyle } from '@/theme/types'
import { useImagePicker } from '@/utils/useImagePicker'
import { Camera } from 'lucide-react-native'
import { SelectField } from '@/components/SelectField'
import { ONBOARDING_PURPOSES } from '@/utils/Constants'

type Props = {
    handleForm: (field: string, value: any) => void,
    form: ClientDetailsType,
    setDatePicker: (val: ClientDateType) => void,
    isUpdate?: boolean,
    validNumber: boolean,
}

const PersonalInfo: FC<Props> = ({ handleForm, form, setDatePicker, isUpdate, validNumber }) => {
    const { theme: { colors, spacing }, themed } = useAppTheme();
    const { showImagePickerOptions } = useImagePicker();

    const phoneRef = useRef<any>(null);
    const ageRef = useRef<any>(null);

    const handleImageSelect = (uri: string) => {
        handleForm('profilePicture', uri);
    };

    return (
        <View style={{ marginTop: 15 }}>
            <Text preset='heading'>Personal Details</Text>
            <Text weight='light'>Please {isUpdate ? 'update' : 'enter'} client's basic information.</Text>

            {/* Profile Picture Upload */}
            <View style={{ alignItems: 'center', marginTop: spacing.md }}>
                <Pressable onPress={() => showImagePickerOptions(handleImageSelect)}>
                    <View style={themed($profilePictureContainer)}>
                        {form.profilePicture ? (
                            <Image
                                source={{ uri: form.profilePicture }}
                                style={$profileImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={themed($placeholderContainer)}>
                                <Camera size={32} color={colors.textDim} />
                            </View>
                        )}
                    </View>
                    <View style={themed($cameraIconBadge)}>
                        <Ionicons name="camera" size={16} color={colors.background} />
                    </View>
                </Pressable>
                <Text size="xs" style={{ color: colors.textDim, marginTop: spacing.xs }}>
                    {form.profilePicture ? 'Tap to change photo' : 'Tap to add photo (optional)'}
                </Text>
            </View>

            <View style={{ marginTop: 20 }}>
                <TextField
                    value={form.name}
                    onChangeText={(val) => { handleForm('name', val) }}
                    containerStyle={themed($textField)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    label="Full Name"
                    placeholder="e.g. John Doe"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                />
                <TextField
                    ref={phoneRef}
                    status={!validNumber ? 'error' : undefined}
                    helper={!validNumber ? 'Phone number already exists' : undefined}
                    value={form.phoneNumber}
                    onChangeText={(val) => { handleForm('phoneNumber', val) }}
                    containerStyle={themed($textField)}
                    keyboardType='number-pad'
                    maxLength={10}
                    autoCorrect={false}
                    label="Phone Number"
                    placeholder="Enter phone number"
                    returnKeyType="next"
                    onSubmitEditing={() => ageRef.current?.focus()}
                />
                <View style={{ paddingBottom: spacing.lg }}>
                    <Text weight='medium'>Gender</Text>
                    <View style={[$styles.flexRow, { backgroundColor: colors.surface, padding: 4, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: colors.border }]}>
                        {
                            ['Male', 'Female', 'Other'].map((gender: string, index: number) => {
                                const selected = form.gender === gender;
                                return (
                                    <Pressable key={index} style={{ backgroundColor: selected ? colors.tint : colors.surface, width: '33.33%', alignItems: 'center', padding: 10, borderRadius: 10 }} onPress={() => { handleForm('gender', gender) }}>
                                        <Text weight={selected ? 'medium' : 'normal'} style={{ color: selected ? colors.surface : colors.textDim }}>{gender}</Text>
                                    </Pressable>
                                )
                            })
                        }
                    </View>
                </View>
                <View style={[$styles.flexRow, { alignItems: 'baseline' }]}>
                    <TextField
                        ref={ageRef}
                        value={form.age?.toString()}
                        onChangeText={(val) => { handleForm('age', val ? Number(val) : null) }}
                        containerStyle={[themed($textField), { width: '35%' }]}
                        keyboardType='number-pad'
                        autoCorrect={false}
                        label="Age"
                        placeholder="Enter age"
                        returnKeyType="done"
                    />
                    <View style={{ width: '55%' }}>
                        <Text weight='medium'>Birthday</Text>
                        <Pressable style={themed($dateView)} onPress={() => { setDatePicker({ visible: true, type: 'birthday' }) }}>
                            <Text style={{ color: form.birthday ? colors.text : colors.textDim }}>{form.birthday ? formatDate(form.birthday, 'dd/MM/yyyy') : 'dd/mm/yyyy'}</Text>
                            <Ionicons name='calendar-outline' size={20} color={colors.textDim} />
                        </Pressable>
                    </View>
                </View>

                <View style={{ width: '100%', paddingBottom: spacing.lg }}>
                    <Text weight='medium'>Anniversary Date</Text>
                    <Pressable style={themed($dateView)} onPress={() => { setDatePicker({ visible: true, type: 'anniversaryDate' }) }}>
                        <Text style={{ color: form.anniversaryDate ? colors.text : colors.textDim }}>{form.anniversaryDate ? formatDate(form.anniversaryDate, 'dd/MM/yyyy') : 'dd/mm/yyyy'}</Text>
                        <Ionicons name='calendar-outline' size={20} color={colors.textDim} />
                    </Pressable>
                </View>

                <SelectField
                    label="Onboarding Purpose"
                    value={form.onboardingPurpose ? [ONBOARDING_PURPOSES.find(o => o.value === form.onboardingPurpose)] : []}
                    onSelect={(newValues) => handleForm('onboardingPurpose', newValues[0]?.value)}
                    options={ONBOARDING_PURPOSES}
                    multiple={false}
                    labelKey="label"
                    valueKey="value"
                    containerStyle={{ paddingBottom: spacing.xl }}
                />
            </View>
        </View>
    )
}

export default PersonalInfo

const $profilePictureContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 90,
    height: 90,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
})

const $profileImage: ImageStyle = {
    width: 120,
    height: 120,
}

const $placeholderContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
})

const $cameraIconBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    marginBottom: spacing.lg,
})

const $dateView: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
    flexDirection: 'row',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
})