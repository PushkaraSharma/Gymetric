import { SelectField } from "@/components/SelectField";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { navigate } from "@/navigators/navigationUtilities";
import { spacing } from "@/theme/spacing";
import { $styles } from "@/theme/styles";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/theme/context";
import { ThemedStyle } from "@/theme/types";
import React, { useRef } from "react";

type AddMemberCardProps = {
    item: any;
    index: number;
    updateDependent: (index: number, field: string, value: string) => void,
    duplicateNo: string,
    updateExistingDependent: (index: number, action: 'add' | 'delete', item?: any) => void
};

const DependentCard = ({ item, index, updateDependent, duplicateNo, updateExistingDependent }: AddMemberCardProps) => {
    const { theme: { colors, isDark }, themed } = useAppTheme();
    const phoneRef = useRef<any>(null);

    return (
        <View style={[themed($card), { padding: spacing.md, marginVertical: 0, marginBottom: 10 }]} key={index}>
            <View style={[$styles.flexRow, { marginBottom: 10 }]}>
                <Text weight='medium'>Dependent {index + 1}</Text>
                <Pressable style={styles.row} onPress={() => { navigate('Search Client', { handleSelect: updateExistingDependent, index: index }) }}>
                    <Text size='xs' style={{ color: colors.tint, marginRight: 5 }}>Add Existing</Text>
                    <Ionicons name='add-circle-outline' size={20} color={colors.tint} />
                </Pressable>
            </View>
            {
                item?.clientId ?
                    <View style={[$styles.flexRow, themed($clientAdded)]}>
                        <View style={styles.row}>
                            <Octicons name='person-add' size={15} color={colors.tint} style={themed($dependentIcon)} />
                            <View>
                                <Text style={{ color: colors.tint }} size='xs'>{item?.name}  <Text size='xs' style={{ color: colors.textDim }}>({item?.gender})</Text></Text>
                                <Text size='xxs' style={{ color: colors.textDim }}>{item?.phoneNumber}</Text>
                            </View>
                        </View>
                        <Ionicons name='close' size={20} color={colors.textDim} onPress={() => { updateExistingDependent(index, 'delete') }} />
                    </View> :
                    <View>
                        <TextField
                            value={item?.name}
                            onChangeText={(val) => { updateDependent(index, 'name', val) }}
                            containerStyle={{ marginBottom: spacing.sm }}
                            autoCapitalize="words"
                            autoCorrect={false}
                            placeholder="Full Name"
                            returnKeyType="next"
                            onSubmitEditing={() => phoneRef.current?.focus()}
                        />
                        <View style={[$styles.flexRow, { alignItems: 'flex-start' }]}>
                            <View style={{ width: '48%' }}>
                                <TextField
                                    ref={phoneRef}
                                    status={duplicateNo === index.toString() ? 'error' : undefined}
                                    helper={duplicateNo === index.toString() ? 'Phone already exists' : undefined}
                                    HelperTextProps={{ style: { fontSize: 12 } }}
                                    value={item?.phoneNumber}
                                    onChangeText={(val) => { updateDependent(index, 'phoneNumber', val) }}
                                    keyboardType='number-pad'
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    placeholder="Phone"
                                    maxLength={10}
                                    returnKeyType="done"
                                />
                            </View>
                            <View style={{ width: '48%' }}>
                                <SelectField
                                    placeholder="Gender"
                                    value={[{ label: item?.gender }]}
                                    onSelect={(val) => { updateDependent(index, 'gender', val?.[0]?.label) }}
                                    options={[{ label: 'Male' }, { label: 'Female' }, { label: 'Others' }]}
                                    multiple={false}
                                    labelKey={'label'}
                                    valueKey={'label'}
                                />
                            </View>
                        </View>
                    </View>
            }
        </View>
    )
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
});

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
})

const $dependentIcon: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ padding: 10, borderRadius: 20, backgroundColor: colors.surface, alignSelf: 'flex-start', marginRight: 15 })

const $clientAdded: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({ padding: 10, borderColor: colors.tint, borderRadius: 10, borderWidth: 1, backgroundColor: isDark ? colors.palette.slate950 : colors.palette.indigo100 })

export default DependentCard;