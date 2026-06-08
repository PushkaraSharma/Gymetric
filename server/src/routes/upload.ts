import { FastifyInstance } from 'fastify';
import { uploadClientProfilePicture, uploadGymLogo, deleteClientProfilePicture, uploadReceiptAsset } from '../controllers/uploadController.js';

export async function uploadRoutes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticate);

    // POST /api/upload/client-profile - Upload client profile picture
    fastify.post('/client-profile', uploadClientProfilePicture);

    // POST /api/upload/gym-logo - Upload gym logo
    fastify.post('/gym-logo', uploadGymLogo);

    // POST /api/upload/receipt-asset - Upload receipt logo/signature
    fastify.post('/receipt-asset', uploadReceiptAsset);

    // DELETE /api/upload/client-profile/:clientId - Delete client profile picture
    fastify.delete('/client-profile/:clientId', deleteClientProfilePicture);
}
