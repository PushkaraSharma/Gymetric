import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image buffer to Cloudinary
 * @param buffer - Image buffer from multipart upload
 * @param folder - Cloudinary folder name (e.g., 'gymetric/clients', 'gymetric/gyms')
 * @param publicId - Optional custom public ID
 * @returns Cloudinary upload result with secure_url
 */
export const uploadToCloudinary = async (
    buffer: Buffer,
    folder: string = 'gymetric',
    publicId?: string
): Promise<{ secure_url: string; public_id: string }> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: 'image',
                transformation: [
                    { width: 500, height: 500, crop: 'limit' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id
                    });
                } else {
                    reject(new Error('Upload failed'));
                }
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Extract a Cloudinary public ID from a delivery URL.
 * Cloudinary URLs look like .../upload/[v1234567/][public_id].[ext]
 */
export const getCloudinaryPublicId = (url: string): string | null => {
    try {
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;

        const versionPart = parts[uploadIndex + 1];
        const startIdx = versionPart?.startsWith('v') ? uploadIndex + 2 : uploadIndex + 1;
        const publicIdWithExt = parts.slice(startIdx).join('/');
        if (!publicIdWithExt) return null;
        return publicIdWithExt.split('.')[0];
    } catch {
        return null;
    }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID of the image
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        // Don't throw error, just log it
    }
};

export default cloudinary;
