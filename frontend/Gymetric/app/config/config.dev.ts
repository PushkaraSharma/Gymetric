import { Platform } from "react-native";

export default {
  API_URL: Platform.OS === 'android' ? 'http://192.168.1.3:8080' : "http://localhost:8080"
}
