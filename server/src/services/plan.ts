import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { db, type Executor } from "../db/client.js";
import { biometricDevices, branchSettings, branches, users } from "../db/schema.js";
import { effectivePlan, featuresOf, type Feature, type Plan } from "../utils/plans.js";

export type GymPlan = { plan: Plan; expiresAt: Date | null; features: Feature[] };

export const gymPlanOf = (row: { plan: string | null; planExpiresAt: Date | null } | null | undefined): GymPlan => {
    const plan = effectivePlan(row?.plan, row?.planExpiresAt);
    return { plan, expiresAt: row?.planExpiresAt ?? null, features: featuresOf(plan) };
};

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; plan: GymPlan }>();

export function invalidatePlan(branchId?: string) {
    if (branchId) cache.delete(branchId);
    else cache.clear();
}

// For work that runs without a logged-in user (cron, webhooks). Requests use accessOf(request).features.
export async function planOf(branchId: string): Promise<GymPlan> {
    const hit = cache.get(branchId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.plan;
    const [row] = await db
        .select({ plan: branches.plan, planExpiresAt: branches.planExpiresAt })
        .from(branches)
        .where(eq(branches.id, branchId))
        .limit(1);
    const plan = gymPlanOf(row);
    cache.set(branchId, { at: Date.now(), plan });
    return plan;
}

export const hasFeature = async (branchId: string, feature: Feature) => (await planOf(branchId)).features.includes(feature);

// Moves Free gyms that already use a paid feature onto the plan that keeps it working. Never downgrades.
// The same rules run in migration 0004 for gyms already in Postgres; the Mongo import calls this.
export async function grandfatherPlans(exec: Executor = db) {
    const withReader = exec.select({ id: biometricDevices.branchId }).from(biometricDevices);
    await exec.update(branches).set({ plan: "max" }).where(and(eq(branches.plan, "free"), inArray(branches.id, withReader)));

    const withWhatsapp = exec
        .select({ id: branchSettings.branchId })
        .from(branchSettings)
        .where(isNotNull(branchSettings.whatsappPhoneNumberId));
    const withStaff = exec
        .select({ id: users.branchId })
        .from(users)
        .where(notInArray(users.role, ["admin", "owner"]));
    await exec.update(branches).set({ plan: "pro" }).where(and(eq(branches.plan, "free"), inArray(branches.id, withWhatsapp)));
    await exec.update(branches).set({ plan: "pro" }).where(and(eq(branches.plan, "free"), inArray(branches.id, withStaff)));
    invalidatePlan();
}
