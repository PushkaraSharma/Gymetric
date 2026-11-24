import { and, asc, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import { roles, users } from "../db/schema.js";
import { PERMISSION_CATALOG, isPermission } from "../utils/permissions.js";
import { invalidateAccess, requireFeature, requirePermission, roleCounts } from "../services/access.js";

const gymOf = (request: FastifyRequest) => (request.user as { gymId: string }).gymId;

const deny = (reply: FastifyReply, status: number, message: string) =>
    reply.status(status).send({ success: false, message });

const SYSTEM_ORDER = ["owner", "manager", "front_desk", "trainer"];

const parsePermissions = (value: unknown) => {
    if (!Array.isArray(value)) return null;
    return [...new Set(value.filter(isPermission))];
};

const parseName = (value: unknown) => String(value ?? "").trim().slice(0, 40);

export async function roleRoutes(fastify: any) {
    fastify.addHook("onRequest", fastify.authenticate);
    fastify.addHook("preHandler", requireFeature("staff"));

    // Any logged-in user can read roles: the staff form needs them and so does the viewer's own role.
    fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
        const branchId = gymOf(request);
        const rows = await db.select().from(roles).where(eq(roles.branchId, branchId)).orderBy(asc(roles.createdAt), asc(roles.name));
        const counts = await roleCounts(branchId);
        const sorted = rows.sort((a, b) => {
            const ai = a.key ? SYSTEM_ORDER.indexOf(a.key) : 99;
            const bi = b.key ? SYSTEM_ORDER.indexOf(b.key) : 99;
            return ai - bi;
        });
        return reply.send({
            success: true,
            data: {
                roles: sorted.map((r) => ({
                    _id: r.id,
                    key: r.key,
                    name: r.name,
                    isSystem: r.isSystem,
                    locked: r.key === "owner",
                    permissions: r.permissions,
                    people: counts.get(r.id) ?? 0,
                })),
                catalog: PERMISSION_CATALOG,
            },
        });
    });

    fastify.post("/", { preHandler: requirePermission("settings.access") }, async (request: FastifyRequest, reply: FastifyReply) => {
        const branchId = gymOf(request);
        const body = (request.body ?? {}) as Record<string, unknown>;
        const name = parseName(body.name);
        const permissions = parsePermissions(body.permissions ?? []);
        if (!name) return deny(reply, 400, "Enter a role name");
        if (!permissions) return deny(reply, 400, "Choose permissions");
        const [clash] = await db.select({ id: roles.id }).from(roles)
            .where(and(eq(roles.branchId, branchId), sql`lower(${roles.name}) = lower(${name})`)).limit(1);
        if (clash) return deny(reply, 409, "A role with this name already exists");
        const [row] = await db.insert(roles).values({ branchId, name, permissions }).returning();
        return reply.status(201).send({ success: true, data: { _id: row.id } });
    });

    fastify.patch("/:id", { preHandler: requirePermission("settings.access") }, async (request: FastifyRequest, reply: FastifyReply) => {
        const branchId = gymOf(request);
        const { id } = request.params as { id: string };
        const [existing] = await db.select().from(roles).where(and(eq(roles.id, id), eq(roles.branchId, branchId))).limit(1);
        if (!existing) return deny(reply, 404, "Role not found");
        if (existing.key === "owner") return deny(reply, 400, "The Owner role always has full access");
        const body = (request.body ?? {}) as Record<string, unknown>;
        const name = body.name === undefined ? existing.name : parseName(body.name);
        const permissions = body.permissions === undefined ? existing.permissions : parsePermissions(body.permissions);
        if (!name) return deny(reply, 400, "Enter a role name");
        if (!permissions) return deny(reply, 400, "Choose permissions");
        if (name.toLowerCase() !== existing.name.toLowerCase()) {
            const [clash] = await db.select({ id: roles.id }).from(roles)
                .where(and(eq(roles.branchId, branchId), sql`lower(${roles.name}) = lower(${name})`)).limit(1);
            if (clash) return deny(reply, 409, "A role with this name already exists");
        }
        await db.update(roles).set({ name, permissions, updatedAt: new Date() }).where(eq(roles.id, id));
        invalidateAccess();
        return reply.send({ success: true });
    });

    fastify.delete("/:id", { preHandler: requirePermission("settings.access") }, async (request: FastifyRequest, reply: FastifyReply) => {
        const branchId = gymOf(request);
        const { id } = request.params as { id: string };
        const [existing] = await db.select().from(roles).where(and(eq(roles.id, id), eq(roles.branchId, branchId))).limit(1);
        if (!existing) return deny(reply, 404, "Role not found");
        if (existing.isSystem) return deny(reply, 400, "Default roles can't be deleted");
        const [inUse] = await db.select({ id: users.id }).from(users).where(eq(users.roleId, id)).limit(1);
        if (inUse) return deny(reply, 409, "Move the staff on this role to another role first");
        await db.delete(roles).where(eq(roles.id, id));
        return reply.send({ success: true });
    });
}
