import { FastifyInstance } from 'fastify';
import { setupGymAndAdmin, loginAdmin, resetPassword } from './../controllers/authController.js'

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * @route   POST /api/auth/setup
   * @desc    Initial setup: Creates the Gym and its first Admin User
   */
  fastify.post('/setup', setupGymAndAdmin);

  /**
   * @route   POST /api/auth/login
   * @desc    Admin login to get access token
   */
  fastify.post('/login', loginAdmin);

  /**
   * @route   POST /api/auth/reset-password
   * @desc    Reset password using old password
   */
  fastify.post('/reset-password', { preHandler: [fastify.authenticate] }, resetPassword);
}