import { and, eq, isNull, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db, type Executor } from "../db/client.js";
import { branches, roles, staff, users } from "../db/schema.js";
import { PERMISSIONS, SYSTEM_ROLES, type Permission } from "../utils/permissions.js";

export type Access = {
    userId: string;
    branchId: string;
    isActive: boolean;
    roleId: string | null;
    roleKey: string | null;
    roleName: string;
    permissions: Permission[];
};

// Inserts any system role the branch is missing. Safe to call on every gym creation and at startup.
export async function ensureRoles(branchId: string, exec: Executor = db) {
    await exec
        .insert(roles)
        .values(SYSTEM_ROLES.map((r) => ({ branchId, key: r.key, name: r.name, isSystem: true, permissions: r.permissions })))
        .onConflictDoNothing();
    const rows = await exec.select({ id: roles.id, key: roles.key }).from(roles).where(eq(roles.branchId, branchId));
    return Object.fromEntries(rows.filter((r) => r.key).map((r) => [r.key!, r.id])) as Record<string, string>;
}

const keyForLegacyRole = (role: string) => (role === "admin" || role === "owner" ? "owner" : role);

// Seeds roles for gyms created before access control and links users to them by their old role text.
export async function syncRoles() {
    const unlinked = await db
        .select({ id: users.id, branchId: users.branchId, role: users.role })
        .from(users)
        .where(isNull(users.roleId));
    const allBranches = await db.select({ id: branches.id }).from(branches);
    const roleIds = new Map<string, Record<string, string>>();
    for (const b of allBranches) roleIds.set(b.id, await ensureRoles(b.id));
    for (const u of unlinked) {
        const roleId = roleIds.get(u.branchId)?.[keyForLegacyRole(u.role)];
        if (roleId) await db.update(users).set({ roleId }).where(eq(users.id, u.id));
    }
}

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; access: Access | null }>();

export function invalidateAccess(userId?: string) {
    if (userId) cache.delete(userId);
    else cache.clear();
}

export async function loadAccess(userId: string): Promise<Access | null> {
    const hit = cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.access;
    const [row] = await db
        .select({
            userId: users.id,
            branchId: users.branchId,
            isActive: users.isActive,
            legacyRole: users.role,
            roleId: roles.id,
            roleKey: roles.key,
            roleName: roles.name,
            permissions: roles.permissions,
            staffActive: staff.active,
        })
        .from(users)
        .leftJoin(roles, eq(roles.id, users.roleId))
        .leftJoin(staff, eq(staff.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1);
    let access: Access | null = null;
    if (row) {
        const isOwner = row.roleKey === "owner" || (!row.roleId && keyForLegacyRole(row.legacyRole) === "owner");
        access = {
            userId: row.userId,
            branchId: row.branchId,
            isActive: row.isActive && row.staffActive !== false,
            roleId: row.roleId,
            roleKey: isOwner ? "owner" : row.roleKey,
            roleName: row.roleName ?? (isOwner ? "Owner" : row.legacyRole),
            permissions: isOwner
                ? [...PERMISSIONS]
                : ((row.permissions ?? []).filter((p) => (PERMISSIONS as readonly string[]).includes(p)) as Permission[]),
        };
    }
    cache.set(userId, { at: Date.now(), access });
    return access;
}

export const accessOf = (request: FastifyRequest): Access | null => (request as any).access ?? null;

export const can = (request: FastifyRequest, permission: Permission) =>
    accessOf(request)?.permissions.includes(permission) ?? false;

export const isOwner = (request: FastifyRequest) => accessOf(request)?.roleKey === "owner";

// Route preHandler: `preHandler: [fastify.authenticate, requirePermission("clients.renew")]`.
export const requirePermission =
    (...anyOf: Permission[]) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
        if (anyOf.some((p) => can(request, p))) return;
        return reply.status(403).send({ success: false, message: "You don't have access to this. Ask the gym owner." });
    };

export const forbid = (reply: FastifyReply) =>
    reply.status(403).send({ success: false, message: "You don't have access to this. Ask the gym owner." });

export async function roleCounts(branchId: string) {
    const rows = await db
        .select({ roleId: users.roleId, count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.branchId, branchId)))
        .groupBy(users.roleId);
    return new Map(rows.map((r) => [r.roleId, r.count]));
}
