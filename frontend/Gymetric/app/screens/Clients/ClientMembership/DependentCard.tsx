import { SelectField } from "@/components/SelectField";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { navigate } from "@/navigators/navigationUtilities";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { $styles } from "@/theme/styles";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

type AddMemberCardProps = {
    item: any;
    index: number;
    updateDependent: (index: number, field: string, value: string) => void,
    duplicateNo: string,
    updateExistingDependent: (index: number, action: 'add' | 'delete', item?: any) => void
};

const DependentCard = ({ item, index, updateDependent, duplicateNo, updateExistingDependent }: AddMemberCardProps) => {

    return (
        <View style={[$styles.card, { padding: spacing.md, marginVertical: 0, marginBottom: 10 }]} key={index}>
            <View style={[$styles.flexRow, { marginBottom: 10 }]}>
                <Text weight='medium'>Dependent {index + 1}</Text>
                <Pressable style={styles.row} onPress={() => { navigate('Search Client', { handleSelect: updateExistingDependent, index: index }) }}>
                    <Text size='xs' style={{ color: colors.tint, marginRight: 5 }}>Add Existing</Text>
                    <Ionicons name='add-circle-outline' size={20} color={colors.tint} />
                </Pressable>
            </View>
            {
                item?.clientId ?
                    <View style={[$styles.flexRow, styles.clientAdded]}>
                        <View style={styles.row}>
                            <Octicons name='person-add' size={15} color={colors.tint} style={styles.dependentIcon} />
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
                        />
                        <View style={[$styles.flexRow, { alignItems: 'flex-start' }]}>
                            <View style={{ width: '48%' }}>
                                <TextField
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
    clientAdded: { padding: 10, borderColor: colors.tint, borderRadius: 5, borderWidth: 1, backgroundColor: colors.palette.indigo100 },
    row: { flexDirection: 'row', alignItems: 'center' },
    dependentIcon: { padding: 10, borderRadius: 20, backgroundColor: '#fff', alignSelf: 'flex-start', marginRight: 15 }
});

export default DependentCard;