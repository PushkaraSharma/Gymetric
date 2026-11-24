// Keys shared with CoreWave (packages/shared `permissions`) use CoreWave's exact names so roles,
// checks and screens can move between the two products. GymKarta-only keys: attendance.manage,
// door.open, entrance.manage, whatsapp.chat, whatsapp.settings, settings.plans.
export const PERMISSIONS = [
    "clients.view",
    "clients.create",
    "clients.edit",
    "clients.archive",
    "clients.renew",
    "clients.freeze",
    "clients.collect",
    "clients.upgrade",
    "bill.discount",
    "dashboard.revenue",
    "reports.view",
    "staff.view",
    "staff.manage",
    "attendance.manage",
    "door.open",
    "entrance.manage",
    "whatsapp.chat",
    "whatsapp.settings",
    "settings.branch",
    "settings.plans",
    "settings.access",
    "data.delete",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_CATALOG: { key: Permission; group: string; label: string }[] = [
    { key: "clients.view", group: "Clients", label: "View the client list" },
    { key: "clients.create", group: "Clients", label: "Add a client" },
    { key: "clients.edit", group: "Clients", label: "Edit a client" },
    { key: "clients.archive", group: "Clients", label: "Delete a client" },
    { key: "clients.renew", group: "Clients", label: "Renew a membership" },
    { key: "clients.freeze", group: "Clients", label: "Freeze and resume" },
    { key: "clients.collect", group: "Clients", label: "Collect a payment" },
    { key: "clients.upgrade", group: "Clients", label: "Upgrade a membership" },
    { key: "bill.discount", group: "Billing", label: "Give a discount" },
    { key: "dashboard.revenue", group: "Dashboard", label: "See revenue" },
    { key: "reports.view", group: "Reports", label: "Open reports" },
    { key: "staff.view", group: "Staff", label: "View staff" },
    { key: "staff.manage", group: "Staff", label: "Add and edit staff" },
    { key: "attendance.manage", group: "Attendance", label: "Record and void staff punches" },
    { key: "door.open", group: "Entrance", label: "Open the door" },
    { key: "entrance.manage", group: "Entrance", label: "Pair and switch the reader" },
    { key: "whatsapp.chat", group: "WhatsApp", label: "Chat with clients" },
    { key: "whatsapp.settings", group: "WhatsApp", label: "Change WhatsApp settings" },
    { key: "settings.branch", group: "Settings", label: "Edit gym info and receipts" },
    { key: "settings.plans", group: "Settings", label: "Edit membership plans" },
    { key: "settings.access", group: "Settings", label: "Edit roles and access" },
    { key: "data.delete", group: "Data", label: "Delete records (bills, memberships)" },
];

export const isPermission = (value: unknown): value is Permission =>
    typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);

export type SystemRoleKey = "owner" | "manager" | "front_desk" | "trainer";

// Owner always has every permission and cannot be edited, so nobody can lock the gym out.
export const SYSTEM_ROLES: { key: SystemRoleKey; name: string; permissions: Permission[] }[] = [
    { key: "owner", name: "Owner", permissions: [...PERMISSIONS] },
    {
        key: "manager",
        name: "Manager",
        permissions: PERMISSIONS.filter((p) => p !== "settings.access" && p !== "whatsapp.settings"),
    },
    {
        key: "front_desk",
        name: "Front desk",
        permissions: [
            "clients.view",
            "clients.create",
            "clients.edit",
            "clients.renew",
            "clients.freeze",
            "clients.collect",
            "clients.upgrade",
            "staff.view",
            "attendance.manage",
            "door.open",
            "whatsapp.chat",
        ],
    },
    { key: "trainer", name: "Trainer", permissions: ["clients.view"] },
];

// users.role text kept in step with the role, for old tokens and old code paths.
export const legacyRoleFor = (key: string | null | undefined) => (key === "owner" ? "admin" : key ?? "custom");
