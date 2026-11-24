import { requirePermission as need } from "../services/access.js";
import { addMembership, getAllMemberships, updateMembership, deleteMembership } from "../controllers/membershipController.js";

export async function membershipRoutes(fastify: any) {
    fastify.addHook('onRequest', fastify.authenticate);

    // GET /api/membership/all
    fastify.get('/all', getAllMemberships);

    // POST /api/membership/add
    fastify.post('/add', { preHandler: need('settings.plans') }, addMembership);

    //PATCH /api/membership/id=
    fastify.patch('/update', { preHandler: need('settings.plans') }, updateMembership)

    // DELETE /api/membership/delete?id=
    fastify.delete('/delete', { preHandler: need('settings.plans') }, deleteMembership)

}