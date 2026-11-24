// Existing gym owners are stored as `admin`. `owner` is accepted so a later rename does not lock anyone out.
export const OWNER_ROLES = ["admin", "owner"] as const;
export const STAFF_ROLES = ["front_desk", "trainer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const isOwnerRole = (role?: string | null) =>
    role === "admin" || role === "owner" || role === undefined || role === null;

export const isStaffRole = (role?: string | null): role is StaffRole =>
    role === "front_desk" || role === "trainer";

// Front desk and trainers work the floor. Revenue stays with the owner.
export const hidesRevenue = (role?: string | null) => isStaffRole(role);

export const normalizePhone = (raw: string) => {
    const trimmed = raw.trim().replace(/[\s-]/g, "");
    if (trimmed.startsWith("+")) return trimmed;
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    return trimmed;
};

const SHIFT = /^([01]\d|2[0-3]):[0-5]\d$/;

export const parseShifts = (value: unknown): { start: string; end: string }[] | null => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) return null;
    const shifts: { start: string; end: string }[] = [];
    for (const item of value) {
        if (!item || typeof item !== "object") return null;
        const start = String((item as any).start ?? "");
        const end = String((item as any).end ?? "");
        if (!SHIFT.test(start) || !SHIFT.test(end)) return null;
        shifts.push({ start, end });
    }
    return shifts;
};

export const parseWeekOffs = (value: unknown): number[] | null => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) return null;
    const days: number[] = [];
    for (const day of value) {
        const n = Number(day);
        if (!Number.isInteger(n) || n < 0 || n > 6 || days.includes(n)) return null;
        days.push(n);
    }
    return days;
};
