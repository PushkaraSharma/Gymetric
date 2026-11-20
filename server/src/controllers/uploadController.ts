import { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { uploadToCloudinary, deleteFromCloudinary, getCloudinaryPublicId } from '../utils/cloudinary.js';
import { db } from '../db/client.js';
import { branches, members } from '../db/schema.js';
import { findBranch, findMember } from '../db/queries.js';
import { invalidateClientCaches } from '../utils/cache.js';

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

        const client = await findMember(db, clientId, gymId);
        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }

        // Delete old picture if exists
        if (client.profilePicture) {
            const publicId = getCloudinaryPublicId(client.profilePicture);
            if (publicId) await deleteFromCloudinary(publicId);
        }

        // Upload to Cloudinary
        const result = await uploadToCloudinary(
            buffer,
            `gymetric/clients/${gymId}`,
            `client_${clientId}`
        );

        await db.update(members)
            .set({ profilePicture: result.secure_url, updatedAt: new Date() })
            .where(eq(members.id, client.id));
        invalidateClientCaches(gymId);

        return reply.send({
            success: true,
            data: {
                profilePicture: result.secure_url
            }
        });
    } catch (error: any) {
        request.log.error({ err: error }, 'Upload error');
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
        const gym = await findBranch(db, gymId);
        if (!gym) {
            return reply.status(404).send({ success: false, message: 'Gym not found' });
        }

        // Delete old logo if exists
        if (gym.logo) {
            const publicId = getCloudinaryPublicId(gym.logo);
            if (publicId) await deleteFromCloudinary(publicId);
        }

        // Upload new logo to Cloudinary
        const result = await uploadToCloudinary(
            buffer,
            'gymetric/gyms',
            `gym_${gymId}`
        );

        await db.update(branches)
            .set({ logo: result.secure_url, updatedAt: new Date() })
            .where(eq(branches.id, gym.id));

        return reply.send({
            success: true,
            data: {
                logo: result.secure_url
            }
        });
    } catch (error: any) {
        request.log.error({ err: error }, 'Upload error');
        return reply.status(500).send({ success: false, error: error.message });
    }
};

/**
 * Upload receipt logo/signature asset
 */
export const uploadReceiptAsset = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const data = await (request as any).file();

        if (!data) {
            return reply.status(400).send({ success: false, message: 'No file uploaded' });
        }

        const assetType = (request.query as any).type === 'logo' ? 'logo' : 'signature';
        const buffer = await data.toBuffer();

        const result = await uploadToCloudinary(
            buffer,
            `gymetric/receipts/${gymId}`,
            `receipt_${assetType}_${Date.now()}`
        );

        return reply.send({
            success: true,
            data: {
                url: result.secure_url
            }
        });
    } catch (error: any) {
        request.log.error({ err: error }, 'Receipt asset upload error');
        return reply.status(500).send({ success: false, error: error.message });
    }
};

/**
 * Upload the per-gym WhatsApp onboarding header image.
 * Does not persist the URL — the settings screen saves it.
 */
export const uploadWhatsappHeaderImage = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const data = await (request as any).file();

        if (!data) {
            return reply.status(400).send({ success: false, message: 'No file uploaded' });
        }

        const buffer = await data.toBuffer();
        const result = await uploadToCloudinary(
            buffer,
            `gymetric/whatsapp/${gymId}`,
            `header_${Date.now()}`
        );

        return reply.send({
            success: true,
            data: {
                url: result.secure_url
            }
        });
    } catch (error: any) {
        request.log.error({ err: error }, 'WhatsApp header upload error');
        return reply.status(500).send({ success: false, error: error.message });
    }
};

/**
 * Delete client profile picture
 */
export const deleteClientProfilePicture = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const clientId = (request.params as any).clientId;

        const client = await findMember(db, clientId, gymId);
        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }

        if (client.profilePicture) {
            const publicId = getCloudinaryPublicId(client.profilePicture);
            if (publicId) await deleteFromCloudinary(publicId);

            await db.update(members)
                .set({ profilePicture: null, updatedAt: new Date() })
                .where(eq(members.id, client.id));
            invalidateClientCaches(gymId);
        }

        return reply.send({ success: true, message: 'Profile picture deleted' });
    } catch (error: any) {
        request.log.error({ err: error }, 'Delete error');
        return reply.status(500).send({ success: false, error: error.message });
    }
};
