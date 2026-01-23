import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { $styles } from "@/theme/styles";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type AddMemberCardProps = {
    item: any;
    index: number;
    updateDependent: (index: number, field: string, value: string) => void,
    duplicateNo: string
};

const DependentCard = ({ item, index, updateDependent, duplicateNo }: AddMemberCardProps) => (
    <View style={[$styles.card, { padding: spacing.md, marginVertical: 0, marginBottom: 10 }]} key={index}>
        <View style={[$styles.flexRow, { marginBottom: 10 }]}>
            <Text weight='medium'>Dependent {index + 1}</Text>
            <View style={styles.row}>
                <Text size='xs' style={{ color: colors.tint, marginRight: 5 }}>Add Existing</Text>
                <Ionicons name='add-circle-outline' size={20} color={colors.tint} />
            </View>
        </View>
        {
            item?.clientId ?
                <View style={[$styles.flexRow, styles.clientAdded]}>
                    <View style={styles.row}>
                        <Octicons name='person-add' size={15} color={colors.tint} style={styles.dependentIcon} />
                        <View>
                            <Text style={{ color: colors.tint }} size='xs'>{'Sarah Miller'}</Text>
                            <Text size='xxs' style={{ color: colors.textDim }}>9898989897</Text>
                        </View>
                    </View>
                    <Ionicons name='close' size={20} color={colors.textDim} onPress={() => { }} />
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
                    <View style={styles.row}>
                        <View style={{ width: '49%' }}>
                            <TextField
                                status={duplicateNo === index.toString() ? 'error' : undefined}
                                helper={duplicateNo === index.toString() ? 'Phone number already exists' : undefined}
                                value={item?.phoneNumber}
                                onChangeText={(val) => { updateDependent(index, 'phoneNumber', val) }}
                                containerStyle={{ marginBottom: spacing.sm }}
                                keyboardType='number-pad'
                                autoCapitalize="words"
                                autoCorrect={false}
                                placeholder="Phone"
                                maxLength={10}
                            />
                        </View>
                        <View style={{ width: '49%' }}>
                            {/* <SelectField
                                label='hehe'
                                    placeholder="Gender"
                                    value={item?.gender}
                                    onSelect={(val) => {}}
                                    options={[{label: 'male'}, {label: 'female'}, {label: 'others'}]}
                                    multiple={false}
                                    labelKey={'label'}
                                    valueKey={"label"}
                                    containerStyle={{ marginBottom: spacing.lg }}
                                /> */}
                        </View>
                    </View>
                </View>
        }
    </View>
);

const styles = StyleSheet.create({
    clientAdded: { padding: 10, borderColor: colors.tint, borderRadius: 5, borderWidth: 1, backgroundColor: colors.palette.primary100 },
    row: { flexDirection: 'row', alignItems: 'center' },
    dependentIcon: { padding: 10, borderRadius: 20, backgroundColor: '#fff', alignSelf: 'flex-start', marginRight: 15 }
});

export default DependentCard;