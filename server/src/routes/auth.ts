import { FastifyInstance } from 'fastify';
import { setupGymAndAdmin, loginAdmin, resetPassword, verifyOtp, onboard, passwordLogin, checkUser } from './../controllers/authController.js'

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * @route   POST /api/auth/verify-otp
   * @desc    Verify Firebase OTP token, check if user exists
   */
  fastify.post('/verify-otp', verifyOtp);

  /**
   * @route   POST /api/auth/onboard
   * @desc    Create Gym and Admin User (requires verified Firebase Token)
   */
  fastify.post('/onboard', onboard);

  /**
   * @route   POST /api/auth/login-password
   * @desc    Login using Phone Number and Password
   */
  fastify.post('/login-password', passwordLogin);

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

  /**
   * @route   POST /api/auth/check-user
   * @desc    Check if user exists and has password
   */
  fastify.post('/check-user', checkUser);
}