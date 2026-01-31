import { FastifyRequest, FastifyReply } from 'fastify';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import Client from '../models/Client.js';
import Gym from '../models/Gym.js';

/**
 * Extract Cloudinary public ID from URL
 */
const getPublicIdFromUrl = (url: string): string | null => {
    try {
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;

        // Everything after /upload/v1234567/ is the public ID
        // Cloudinary URLs: .../upload/[version]/[public_id].[ext]
        const versionPart = parts[uploadIndex + 1];
        const startIdx = versionPart.startsWith('v') ? uploadIndex + 2 : uploadIndex + 1;

        const publicIdWithExt = parts.slice(startIdx).join('/');
        return publicIdWithExt.split('.')[0];
    } catch (error) {
        return null;
    }
};

/**
 * Upload client profile picture
 */
export const uploadClientProfilePicture = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const data = await (request as any).file();

        if (!data) {
            return reply.status(400).send({ success: false, message: 'No file uploaded' });
        }

        const buffer = await data.toBuffer();
        const clientId = (request.query as any).clientId;

        if (!clientId) {
            return reply.status(400).send({ success: false, message: 'Client ID is required' });
        }

        const client = await Client.findById(clientId);
        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }

        // Delete old picture if exists
        if (client.profilePicture) {
            const publicId = getPublicIdFromUrl(client.profilePicture);
            if (publicId) await deleteFromCloudinary(publicId);
        }

        // Upload to Cloudinary
        const result = await uploadToCloudinary(
            buffer,
            `gymetric/clients/${gymId}`,
            `client_${clientId}`
        );

        // Update client record
        client.profilePicture = result.secure_url;
        await client.save();

        return reply.send({
            success: true,
            data: {
                profilePicture: result.secure_url
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

/**
 * Upload gym logo
 */
export const uploadGymLogo = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const data = await (request as any).file();

        if (!data) {
            return reply.status(400).send({ success: false, message: 'No file uploaded' });
        }

        const buffer = await data.toBuffer();

        // Get existing gym to check for old logo
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return reply.status(404).send({ success: false, message: 'Gym not found' });
        }

        // Delete old logo if exists
        if (gym.logo) {
            const publicId = getPublicIdFromUrl(gym.logo);
            if (publicId) await deleteFromCloudinary(publicId);
        }

        // Upload new logo to Cloudinary
        const result = await uploadToCloudinary(
            buffer,
            'gymetric/gyms',
            `gym_${gymId}`
        );

        // Update gym record
        gym.logo = result.secure_url;
        await gym.save();

        return reply.send({
            success: true,
            data: {
                logo: result.secure_url
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

/**
 * Delete client profile picture
 */
export const deleteClientProfilePicture = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const clientId = (request.params as any).clientId;

        const client = await Client.findById(clientId);
        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }

        if (client.profilePicture) {
            const publicId = getPublicIdFromUrl(client.profilePicture);
            if (publicId) await deleteFromCloudinary(publicId);

            client.profilePicture = undefined;
            await client.save();
        }

        return reply.send({ success: true, message: 'Profile picture deleted' });
    } catch (error: any) {
        console.error('Delete error:', error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
