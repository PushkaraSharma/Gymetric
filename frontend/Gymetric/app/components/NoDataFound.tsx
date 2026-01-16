import { colors } from "@/theme/colors"
import { Ionicons } from "@expo/vector-icons"
import { FC } from "react"
import { View } from "react-native"
import { Text } from "./Text"

type Props = {
    title: string,
    msg?: string
}

const NoDataFound: FC<Props> = ({ title, msg }) => {
    return (
        <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.tint} />
            <Text preset='subheading'>{title}</Text>
            {msg && <Text style={{ color: colors.textDim, textAlign: 'center' }}>{msg}</Text>}
        </View>
    )
}

export default NoDataFound;