import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
  }

  fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET || 'fallback_secret' });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }
  });
});