import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async (fastify) => {
  // 1. Register the JWT plugin
  fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET});

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      // This automatically looks for the 'Authorization: Bearer <token>' header
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }
  });
});