import { FastifyInstance } from 'fastify';
import { requirePermission as need } from '../services/access.js';
import { uploadUserPhoto, uploadClientProfilePicture, uploadGymLogo, deleteClientProfilePicture, uploadReceiptAsset, uploadWhatsappHeaderImage } from '../controllers/uploadController.js';

export async function uploadRoutes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticate);

    // POST /api/upload/client-profile - Upload client profile picture
    fastify.post('/client-profile', { preHandler: need('clients.create', 'clients.edit') }, uploadClientProfilePicture);

    // POST /api/upload/gym-logo - Upload gym logo
    fastify.post('/gym-logo', { preHandler: need('settings.gym') }, uploadGymLogo);

    // POST /api/upload/receipt-asset - Upload receipt logo/signature
    fastify.post('/receipt-asset', { preHandler: need('settings.gym') }, uploadReceiptAsset);

    // POST /api/upload/whatsapp-header - Upload onboarding WhatsApp header image
    fastify.post('/whatsapp-header', { preHandler: need('whatsapp.settings') }, uploadWhatsappHeaderImage);

    // POST /api/upload/user-photo - Logged-in user's own profile photo
    fastify.post('/user-photo', uploadUserPhoto);

    // DELETE /api/upload/client-profile/:clientId - Delete client profile picture
    fastify.delete('/client-profile/:clientId', { preHandler: need('clients.edit') }, deleteClientProfilePicture);
}
