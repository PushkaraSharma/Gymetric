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
import { Camera, User } from 'lucide-react-native'
import { SelectField } from '@/components/SelectField'
import { ONBOARDING_PURPOSES } from '@/utils/Constants'
import { ClientSectionLabel } from '@/components/clients/ClientSectionLabel'
import { spacing } from '@/theme/spacing'

type Props = {
    handleForm: (field: string, value: any) => void,
    form: ClientDetailsType,
    setDatePicker: (val: ClientDateType) => void,
    isUpdate?: boolean,
    validNumber: boolean,
}

const PersonalInfo: FC<Props> = ({ handleForm, form, setDatePicker, isUpdate, validNumber }) => {
    const { theme: { colors, spacing, typography }, themed } = useAppTheme()
    const { showImagePickerOptions, ImagePickerSheet } = useImagePicker()
    const phoneRef = useRef<any>(null)

    return (
        <View>
            <View style={themed($photoSection)}>
                <Pressable onPress={() => showImagePickerOptions((uri) => handleForm('profilePicture', uri))}>
                    <View style={themed($photoRing)}>
                        {form.profilePicture ? (
                            <Image source={{ uri: form.profilePicture }} style={$photo} resizeMode="cover" />
                        ) : (
                            <View style={themed($photoPlaceholder)}>
                                <User size={36} color={colors.textDim} />
                            </View>
                        )}
                        <View style={themed($photoBadge)}>
                            <Camera size={14} color={colors.background} />
                        </View>
                    </View>
                </Pressable>
            </View>

            <TextField
                value={form.name}
                onChangeText={(val) => handleForm('name', val)}
                containerStyle={themed($field)}
                autoCapitalize="words"
                label="Full Name"
                isRequired
                placeholder="e.g. Rahul Sharma"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
            />
            <TextField
                ref={phoneRef}
                status={!validNumber ? 'error' : undefined}
                helper={!validNumber ? 'Phone number already registered' : undefined}
                value={form.phoneNumber}
                onChangeText={(val) => handleForm('phoneNumber', val)}
                containerStyle={themed($field)}
                keyboardType="number-pad"
                maxLength={10}
                label="Phone Number"
                isRequired
                placeholder="10-digit mobile"
            />
            <Text style={themed($label)}>Gender</Text>
            <View style={[themed($segment), $styles.flexRow]}>
                {['Male', 'Female', 'Other'].map((gender) => {
                    const selected = form.gender === gender
                    return (
                        <Pressable
                            key={gender}
                            style={[themed($segmentItem), selected && { backgroundColor: colors.primary }]}
                            onPress={() => handleForm('gender', gender)}
                        >
                            <Text weight={selected ? 'semiBold' : 'normal'} size="sm" style={{ color: selected ? colors.background : colors.textDim }}>{gender}</Text>
                        </Pressable>
                    )
                })}
            </View>

            <View style={[$styles.flexRow, { gap: 12, marginTop: spacing.md }]}>
                <View style={{ flex: 1 }}>
                    <Text style={themed($label)}>Birthday</Text>
                    <Pressable style={themed($dateRow)} onPress={() => setDatePicker({ visible: true, type: 'birthday' })}>
                        <Text size="sm" style={{ color: form.birthday ? colors.text : colors.textDim }}>
                            {form.birthday ? formatDate(form.birthday, 'dd MMM yyyy') : 'Select date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color={colors.textDim} />
                    </Pressable>
                </View>
                <View style={{ width: 90 }}>
                    <Text style={themed($label)}>Age</Text>
                    <TextInput
                        value={form.age?.toString() || ''}
                        onChangeText={(val) => handleForm('age', val ? Number(val) : null)}
                        keyboardType="number-pad"
                        placeholder="—"
                        placeholderTextColor={colors.textDim}
                        style={themed($ageInput)}
                    />
                </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
                <Text style={themed($label)}>Anniversary (optional)</Text>
                <Pressable style={themed($dateRow)} onPress={() => setDatePicker({ visible: true, type: 'anniversaryDate' })}>
                    <Text size="sm" style={{ color: form.anniversaryDate ? colors.text : colors.textDim }}>
                        {form.anniversaryDate ? formatDate(form.anniversaryDate, 'dd MMM yyyy') : 'Select date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={colors.textDim} />
                </Pressable>
            </View>

            <View style={{ marginTop: spacing.md }}>
                <SelectField
                    label="Onboarding Purpose"
                    value={form.onboardingPurpose ? [ONBOARDING_PURPOSES.find(o => o.value === form.onboardingPurpose)] : []}
                    onSelect={(newValues) => handleForm('onboardingPurpose', newValues[0]?.value)}
                    options={ONBOARDING_PURPOSES}
                    multiple={false}
                    labelKey="label"
                    valueKey="value"
                    containerStyle={{ marginBottom: spacing.xl }}
                />
            </View>

            <ImagePickerSheet />
        </View>
    )
}

export default PersonalInfo

const $photoSection: ThemedStyle<ViewStyle> = () => ({
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
})

const $photoRing: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    overflow: 'visible',
    position: 'relative',
})

const $photo: ImageStyle = { width: 96, height: 96, borderRadius: 48 }

const $photoPlaceholder: ThemedStyle<ViewStyle> = ({ colors }) => ({
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
})

const $photoBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
})

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
    marginBottom: spacing.md,
})

const $label: ThemedStyle<ViewStyle> = ({ spacing, typography, colors }) => ({
    fontSize: typography.s, color: colors.textDim, marginBottom: spacing.xs, fontWeight: typography.medium
})

const $segment: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
})

const $segmentItem: ThemedStyle<ViewStyle> = () => ({
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
})

const $dateRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
})

const $ageInput: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
})
