import React from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerResult {
    uri: string;
    canceled: boolean;
}

export const useImagePicker = () => {
    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant camera and photo library permissions to upload images.',
                    [{ text: 'OK' }]
                );
                return false;
            }
        }
        return true;
    };

    const pickImageFromGallery = async (): Promise<ImagePickerResult | null> => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return null;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            return {
                uri: result.assets[0].uri,
                canceled: false,
            };
        }

        return null;
    };

    const pickImageFromCamera = async (): Promise<ImagePickerResult | null> => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return null;

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            return {
                uri: result.assets[0].uri,
                canceled: false,
            };
        }

        return null;
    };

    const showImagePickerOptions = (onImageSelected: (uri: string) => void) => {
        Alert.alert(
            'Select Photo',
            'Choose an option to upload your photo',
            [
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        const result = await pickImageFromCamera();
                        if (result && !result.canceled) {
                            onImageSelected(result.uri);
                        }
                    },
                },
                {
                    text: 'Choose from Gallery',
                    onPress: async () => {
                        const result = await pickImageFromGallery();
                        if (result && !result.canceled) {
                            onImageSelected(result.uri);
                        }
                    },
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    return {
        pickImageFromGallery,
        pickImageFromCamera,
        showImagePickerOptions,
    };
};
