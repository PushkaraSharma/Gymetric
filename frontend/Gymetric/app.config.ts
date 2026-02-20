import { ExpoConfig, ConfigContext } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => ({
    name: "Gymetric",
    slug: "Gymetric",
    scheme: "gymetric",
    version: "0.0.3",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: "./assets/images/app-icon.png",
    updates: {
        fallbackToCacheTimeout: 0,
        url: "https://u.expo.dev/2e469ab5-5d58-49e3-afe3-b245dfa7d3c7",
    },
    newArchEnabled: true,
    jsEngine: "hermes",
    assetBundlePatterns: ["**/*"],
    android: {
        icon: "./assets/images/app-icon.png",
        package: "com.indieroots.gymetric",
        allowBackup: false,
        edgeToEdgeEnabled: true,
        googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    ios: {
        googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
        icon: "./assets/images/app-icon.png",
        supportsTablet: true,
        bundleIdentifier: "com.indieroots.gymetric",
        infoPlist: {
            NSCameraUsageDescription: "This app uses the camera to capture profile photos.",
            NSPhotoLibraryUsageDescription: "This app uses the photo library to select profile photos.",
            LSApplicationQueriesSchemes: ["whatsapp", "tel"],
        },
        privacyManifests: {
            NSPrivacyAccessedAPITypes: [
                {
                    NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
                    NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
                },
            ],
        },
    },
    plugins: [
        "@react-native-community/datetimepicker",
        "expo-localization",
        "expo-font",
        [
            "expo-splash-screen",
            {
                image: "./assets/images/app-icon.png",
                resizeMode: "contain",
                backgroundColor: "#FFFFFF",
                dark: {
                    image: "./assets/images/app-icon-dark.png",
                    backgroundColor: "#020617",
                },
            },
        ],
        [
            "react-native-edge-to-edge",
            {
                android: {
                    parentTheme: "Default",
                    enforceNavigationBarContrast: false,
                },
            },
        ],
        [
            "expo-build-properties",
            {
                ios: {
                    useFrameworks: "static",
                    podfileProperties: {
                        use_modular_headers: "true",
                    },
                    forceStaticLinking: [
                        "RNFBApp",
                        "RNFBAnalytics",
                        "RNFBCrashlytics",
                        "RNFBPerf",
                    ],
                },
            },
        ],
        "@react-native-firebase/app",
        "@react-native-firebase/auth",
    ],
    experiments: {
        tsconfigPaths: true,
    },
    extra: {
        ignite: {
            version: "11.4.0",
        },
        eas: {
            projectId: "2e469ab5-5d58-49e3-afe3-b245dfa7d3c7",
        },
    },
    runtimeVersion: {
        policy: "appVersion",
    },
})
