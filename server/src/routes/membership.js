import { addMembership, getAllMemberships, updateMembership } from "../controllers/membershipController.js";

export async function membershipRoutes(fastify) {
    fastify.addHook('onRequest', fastify.authenticate);

    // GET /api/membership/all
    fastify.get('/all', getAllMemberships);

    // POST /api/membership/add
    fastify.post('/add', addMembership);

    //PATCH /api/membership/id=
    fastify.patch('/update', updateMembership)

}