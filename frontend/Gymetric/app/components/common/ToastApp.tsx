import Toast from "react-native-toast-message"
import { useToastConfig } from "../ToastConfig"
import { initialWindowMetrics } from "react-native-safe-area-context"

export default function ToastApp() {
    const toastConfig = useToastConfig()
    return (
        <Toast
            config={toastConfig}
            topOffset={initialWindowMetrics?.insets.top ?? 40}
            visibilityTime={2000}
        />
    )
}
