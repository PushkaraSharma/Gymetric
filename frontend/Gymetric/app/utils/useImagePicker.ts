import React from 'react';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerResult {
    uri: string;
    canceled: boolean;
}

export const useImagePicker = () => {
    const pickImageFromGallery = async (): Promise<ImagePickerResult | null> => {
        if (Platform.OS !== 'web') {
            let mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (!mediaPermission?.granted && mediaPermission?.canAskAgain) {
                await new Promise((resolve) => {
                    Alert.alert(
                        'Photo Library Access',
                        'We need access to your photo library to let you choose and upload a profile photo. Please proceed to grant the permission.',
                        [{ text: 'Continue', onPress: resolve }]
                    );
                });
                mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            }

            if (!mediaPermission?.granted) {
                Alert.alert(
                    'Permission Required',
                    'Please enable photo library permissions in your device settings to upload images.',
                    [{ text: 'OK' }]
                );
                return null;
            }
        }

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
        if (Platform.OS !== 'web') {
            let cameraPermission = await ImagePicker.getCameraPermissionsAsync();
            if (!cameraPermission?.granted && cameraPermission?.canAskAgain) {
                await new Promise((resolve) => {
                    Alert.alert(
                        'Camera Access',
                        'We need camera access to let you capture and upload a profile photo. Please proceed to grant the permission.',
                        [{ text: 'Continue', onPress: resolve }]
                    );
                });
                cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            }

            if (!cameraPermission?.granted) {
                Alert.alert(
                    'Permission Required',
                    'Please enable camera permissions in your device settings to take photos.',
                    [{ text: 'OK' }]
                );
                return null;
            }
        }

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
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
                    cancelButtonIndex: 0,
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        const result = await pickImageFromCamera();
                        if (result && !result.canceled) {
                            onImageSelected(result.uri);
                        }
                    } else if (buttonIndex === 2) {
                        const result = await pickImageFromGallery();
                        if (result && !result.canceled) {
                            onImageSelected(result.uri);
                        }
                    }
                }
            );
        } else {
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
        }
    };

    return {
        pickImageFromGallery,
        pickImageFromCamera,
        showImagePickerOptions,
    };
};
