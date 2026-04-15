import React from 'react';
import { Alert, Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerSheet } from '@/components/ImagePickerSheet';

export interface ImagePickerResult {
    uri: string;
    canceled: boolean;
}

export const useImagePicker = () => {
    const pickImageFromGallery = async (): Promise<ImagePickerResult | null> => {
        if (Platform.OS !== 'web') {
            let mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (!mediaPermission?.granted && mediaPermission?.canAskAgain) {
                mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            }

            if (!mediaPermission?.granted) {
                Alert.alert(
                    'Permission Required',
                    'Please enable photo library access in Settings to upload images.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
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
                cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            }

            if (!cameraPermission?.granted) {
                Alert.alert(
                    'Permission Required',
                    'Please enable camera access in Settings to take photos.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
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

    const [isVisible, setIsVisible] = React.useState(false);
    const [callback, setCallback] = React.useState<(uri: string) => void>(() => {});

    const showImagePickerOptions = (onImageSelected: (uri: string) => void) => {
        setCallback(() => onImageSelected);
        setIsVisible(true);
    };

    const handleSelect = async (type: 'camera' | 'gallery') => {
        setIsVisible(false);
        const result = type === 'camera' ? await pickImageFromCamera() : await pickImageFromGallery();
        if (result && !result.canceled) {
            callback(result.uri);
        }
    };

    const ImagePickerSheetComponent = () => (
        <ImagePickerSheet 
            isVisible={isVisible} 
            onSelect={handleSelect} 
        />
    );

    return {
        pickImageFromGallery,
        pickImageFromCamera,
        showImagePickerOptions,
        ImagePickerSheet: ImagePickerSheetComponent,
    };
};
