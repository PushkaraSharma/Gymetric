import {setupGymAndAdmin, loginAdmin} from './../controllers/authController.js'

export async function authRoutes(fastify) {
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
}