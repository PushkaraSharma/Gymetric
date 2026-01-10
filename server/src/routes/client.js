export async function clientRoutes(fastify) {
    fastify.get('/all', { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            const gymId = request.user.gymId;
            return { message: `Showing clients for gym: ${gymId}` };
        }
    )
}