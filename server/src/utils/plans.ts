// What each GymKarta plan unlocks. Plans are set by the GymKarta team (`npm run plan`), not bought in the app.
export const PLANS = ["free", "pro", "max"] as const;
export type Plan = (typeof PLANS)[number];

export const FEATURES = ["whatsapp", "staff", "reports", "biometric"] as const;
export type Feature = (typeof FEATURES)[number];

const PLAN_FEATURES: Record<Plan, readonly Feature[]> = {
    free: [],
    pro: ["whatsapp", "staff", "reports"],
    max: ["whatsapp", "staff", "reports", "biometric"],
};

export const isPlan = (value: unknown): value is Plan =>
    typeof value === "string" && (PLANS as readonly string[]).includes(value);

// A plan with an end date (a trial, or a lapsed subscription) falls back to Free once it passes.
export const effectivePlan = (plan: string | null | undefined, expiresAt: Date | null | undefined, now = new Date()): Plan => {
    if (!isPlan(plan)) return "free";
    if (expiresAt && expiresAt.getTime() <= now.getTime()) return "free";
    return plan;
};

export const featuresOf = (plan: Plan): Feature[] => [...PLAN_FEATURES[plan]];
