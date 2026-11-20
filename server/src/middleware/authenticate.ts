import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { eq } from 'drizzle-orm';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { branches, users } from '../db/schema.js';
import { isObjectId } from '../db/queries.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Tokens issued before the Postgres cutover carry Mongo ObjectIds. They stay valid (90-day expiry)
// by resolving to the imported rows through legacy_mongo_id.
const legacyIds = new Map<string, string>();

const resolveLegacy = async (kind: 'user' | 'gym', mongoId: string) => {
  const key = `${kind}:${mongoId}`;
  const cached = legacyIds.get(key);
  if (cached) return cached;
  const table = kind === 'user' ? users : branches;
  const [row] = await db.select({ id: table.id }).from(table).where(eq(table.legacyMongoId, mongoId)).limit(1);
  if (row) legacyIds.set(key, row.id);
  return row?.id ?? null;
};

export default fp(async (fastify: FastifyInstance) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
  }

  fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET || 'fallback_secret' });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }

    const user = request.user as { userId?: string; gymId?: string; role?: string };
    if (!isObjectId(user.userId) && !isObjectId(user.gymId)) return;

    const [userId, gymId] = await Promise.all([
      isObjectId(user.userId) ? resolveLegacy('user', user.userId) : user.userId,
      isObjectId(user.gymId) ? resolveLegacy('gym', user.gymId) : user.gymId,
    ]);
    if (!userId || !gymId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }
    request.user = { ...user, userId, gymId };
  });
});
