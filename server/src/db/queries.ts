import { and, asc, eq, inArray } from "drizzle-orm";
import type { Executor } from "./client.js";
import { branches, branchSettings, memberships, membershipMembers, membershipPauses, members, packages, payments } from "./schema.js";
import { serializeMember, serializeMembership, serializePayment, type MemberRow, type MembershipRow } from "./serializers.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);
export const isObjectId = (value: unknown): value is string => typeof value === "string" && OBJECT_ID_RE.test(value);

// Ids from the app go straight into uuid columns; a stale or malformed id must read as "not found", not a 500.
export const validId = (value: unknown): string | null => (isUuid(value) ? value : null);

export async function findMember(exec: Executor, id: unknown, branchId?: string) {
    const memberId = validId(id);
    if (!memberId) return null;
    const where = branchId ? and(eq(members.id, memberId), eq(members.branchId, branchId)) : eq(members.id, memberId);
    const [row] = await exec.select().from(members).where(where).limit(1);
    return row ?? null;
}

export async function findMembership(exec: Executor, id: unknown, branchId?: string) {
    const membershipId = validId(id);
    if (!membershipId) return null;
    const where = branchId
        ? and(eq(memberships.id, membershipId), eq(memberships.branchId, branchId))
        : eq(memberships.id, membershipId);
    const [row] = await exec.select().from(memberships).where(where).limit(1);
    return row ?? null;
}

export async function findPackage(exec: Executor, id: unknown) {
    const packageId = validId(id);
    if (!packageId) return null;
    const [row] = await exec.select().from(packages).where(eq(packages.id, packageId)).limit(1);
    return row ?? null;
}

export async function findBranch(exec: Executor, id: unknown) {
    const branchId = validId(id);
    if (!branchId) return null;
    const [row] = await exec.select().from(branches).where(eq(branches.id, branchId)).limit(1);
    return row ?? null;
}

export async function findSettings(exec: Executor, branchId: string) {
    const [row] = await exec.select().from(branchSettings).where(eq(branchSettings.branchId, branchId)).limit(1);
    return row ?? null;
}

export async function memberIdsFor(exec: Executor, membershipId: string) {
    const rows = await exec
        .select({ memberId: membershipMembers.memberId })
        .from(membershipMembers)
        .where(eq(membershipMembers.membershipId, membershipId))
        .orderBy(asc(membershipMembers.position));
    return rows.map((r) => r.memberId);
}

export async function pausesFor(exec: Executor, membershipIds: string[]) {
    if (membershipIds.length === 0) return new Map<string, (typeof membershipPauses.$inferSelect)[]>();
    const rows = await exec
        .select()
        .from(membershipPauses)
        .where(inArray(membershipPauses.membershipId, membershipIds))
        .orderBy(asc(membershipPauses.startedAt));
    const byMembership = new Map<string, typeof rows>();
    for (const row of rows) {
        const list = byMembership.get(row.membershipId) ?? [];
        list.push(row);
        byMembership.set(row.membershipId, list);
    }
    return byMembership;
}

export async function addMembershipMember(exec: Executor, membershipId: string, memberId: string) {
    const existing = await memberIdsFor(exec, membershipId);
    if (existing.includes(memberId)) return;
    await exec.insert(membershipMembers).values({ membershipId, memberId, position: existing.length });
}

export async function membershipDoc(exec: Executor, membership: MembershipRow) {
    const [memberIds, pauses] = await Promise.all([memberIdsFor(exec, membership.id), pausesFor(exec, [membership.id])]);
    return serializeMembership(membership, { memberIds, pauses: pauses.get(membership.id) ?? [] });
}

// Membership ids a member belongs to, oldest first (Mongo `Client.membershipHistory`).
export async function historyIdsFor(exec: Executor, memberId: string) {
    const rows = await exec
        .select({ id: memberships.id })
        .from(membershipMembers)
        .innerJoin(memberships, eq(memberships.id, membershipMembers.membershipId))
        .where(eq(membershipMembers.memberId, memberId))
        .orderBy(asc(memberships.createdAt), asc(memberships.startDate));
    return rows.map((r) => r.id);
}

// Insertion order, like the embedded Mongo array (a backdated payment still comes last).
export async function paymentHistoryFor(exec: Executor, memberId: string) {
    const rows = await exec
        .select()
        .from(payments)
        .where(eq(payments.memberId, memberId))
        .orderBy(asc(payments.createdAt), asc(payments.paidAt));
    return rows.map(serializePayment);
}

// Equivalent of returning a saved Mongoose Client document: refs as ids, embedded arrays inline.
export async function memberDoc(exec: Executor, member: MemberRow) {
    const [membershipHistory, paymentHistory] = await Promise.all([
        historyIdsFor(exec, member.id),
        paymentHistoryFor(exec, member.id),
    ]);
    return serializeMember(member, { membershipHistory, paymentHistory });
}

export async function memberDocById(exec: Executor, memberId: string) {
    const member = await findMember(exec, memberId);
    return member ? memberDoc(exec, member) : null;
}
