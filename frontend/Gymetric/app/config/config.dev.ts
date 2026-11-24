import { Platform } from "react-native";

// EXPO_PUBLIC_API_URL points a dev build at another local API (e.g. a second server on another port).
export default {
  API_URL: process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://192.168.1.4:8080' : "http://localhost:8080")
}
