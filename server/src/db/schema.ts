import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    doublePrecision,
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    type AnyPgColumn,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();
// Mongo ObjectId of the source document; null for rows created after cutover.
const legacyId = () => text("legacy_mongo_id").unique();

export const organizations = pgTable("organizations", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    name: text("name").notNull(),
    createdAt: createdAt(),
});

// One branch per GymKarta gym. The JWT `gymId` is a branch id.
export const branches = pgTable("branches", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    ownerName: text("owner_name"),
    contactNumber: text("contact_number").notNull(),
    email: text("email"),
    logo: text("logo"),
    website: text("website"),
    gstin: text("gstin"),
    timings: text("timings"),
    attendanceEnabled: boolean("attendance_enabled").notNull().default(false),
    // GymKarta plan: free | pro | max (see utils/plans.ts). A past plan_expires_at means Free.
    plan: text("plan").notNull().default("free"),
    planExpiresAt: ts("plan_expires_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
});

// System roles carry a key (owner, manager, front_desk, trainer); custom roles have none.
export const roles = pgTable("roles", {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    key: text("key"),
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    uniqueIndex("roles_branch_name").on(t.branchId, t.name),
    uniqueIndex("roles_branch_key").on(t.branchId, t.key),
]);

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    phoneNumber: text("phone_number").unique(),
    firebaseUid: text("firebase_uid").unique(),
    username: text("username").unique(),
    name: text("name"),
    photo: text("photo"),
    passwordHash: text("password_hash"),
    role: text("role").notNull(),
    roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }),
    permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
    isActive: boolean("is_active").notNull().default(true),
    expoPushToken: text("expo_push_token"),
    pushNotificationsEnabled: boolean("push_notifications_enabled").notNull().default(true),
    pushExpiringToday: boolean("push_expiring_today").notNull().default(true),
    pushExpiringSoon: boolean("push_expiring_soon").notNull().default(true),
    pushOutstandingBalance: boolean("push_outstanding_balance").notNull().default(true),
    pushDailySummary: boolean("push_daily_summary").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
});

export const branchSettings = pgTable("branch_settings", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().unique().references(() => branches.id, { onDelete: "cascade" }),
    // Null whatsapp_phone_number_id means WhatsApp was never configured for this gym.
    whatsappAccessToken: text("whatsapp_access_token"),
    whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
    whatsappActive: boolean("whatsapp_active").notNull().default(false),
    whatsappHeaderImageUrl: text("whatsapp_header_image_url"),
    whatsappHeaderImageId: text("whatsapp_header_image_id"),
    whatsappReminderDays: integer("whatsapp_reminder_days").notNull().default(1),
    whatsappSendOnOnboarding: boolean("whatsapp_send_on_onboarding").notNull().default(true),
    whatsappSendOnRenewal: boolean("whatsapp_send_on_renewal").notNull().default(true),
    whatsappSendOnExpiry: boolean("whatsapp_send_on_expiry").notNull().default(true),
    whatsappSendOnReminder: boolean("whatsapp_send_on_reminder").notNull().default(true),
    receiptLogo: text("receipt_logo"),
    receiptSignature: text("receipt_signature"),
    receiptFooterNote: text("receipt_footer_note").notNull().default("Thank you for training with us!"),
    receiptShowGymAddress: boolean("receipt_show_gym_address").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
});

// Plan templates (Mongo `Memberships`).
export const packages = pgTable("packages", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    planName: text("plan_name").notNull(),
    durationInDays: integer("duration_in_days").notNull().default(0),
    durationInMonths: integer("duration_in_months").notNull().default(0),
    price: doublePrecision("price").notNull(),
    isTrial: boolean("is_trial").notNull().default(false),
    // `indivisual` spelling is what the app sends.
    planType: text("plan_type").notNull().default("indivisual"),
    membersAllowed: integer("members_allowed").notNull().default(1),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    sortIndex: integer("sort_index").notNull().default(0),
    // Mongo plans had no timestamps; imported rows take the ObjectId creation time so ties keep their order.
    createdAt: createdAt(),
}, (t) => [index("packages_branch").on(t.branchId, t.sortIndex)]);

export const members = pgTable("members", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phoneNumber: text("phone_number").notNull(),
    age: integer("age"),
    birthday: ts("birthday"),
    anniversaryDate: ts("anniversary_date"),
    onboardingPurpose: text("onboarding_purpose"),
    gender: text("gender"),
    profilePicture: text("profile_picture"),
    balance: doublePrecision("balance").notNull().default(0),
    isSeeded: boolean("is_seeded").notNull().default(false),
    role: text("role").notNull().default("primary"),
    membershipStatus: text("membership_status"),
    activeMembershipId: uuid("active_membership_id").references((): AnyPgColumn => memberships.id, { onDelete: "set null" }),
    upcomingMembershipId: uuid("upcoming_membership_id").references((): AnyPgColumn => memberships.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    uniqueIndex("members_branch_phone").on(t.branchId, t.phoneNumber),
    index("members_branch_status").on(t.branchId, t.membershipStatus),
]);

// Mongo `AssignedMembership`.
export const memberships = pgTable("memberships", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    primaryMemberId: uuid("primary_member_id").notNull().references((): AnyPgColumn => members.id, { onDelete: "cascade" }),
    // No foreign key: as in Mongo, deleting a plan leaves the reference so past sales still group by plan.
    packageId: uuid("package_id"),
    planName: text("plan_name"),
    startDate: ts("start_date").notNull(),
    endDate: ts("end_date").notNull(),
    status: text("status").notNull(),
    totalAmount: doublePrecision("total_amount").notNull(),
    totalPausedDays: integer("total_paused_days").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    index("memberships_branch_status_end").on(t.branchId, t.status, t.endDate),
    index("memberships_primary").on(t.primaryMemberId),
]);

// Mongo `AssignedMembership.memberIds`; position keeps the original array order.
export const membershipMembers = pgTable("membership_members", {
    membershipId: uuid("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
}, (t) => [
    primaryKey({ columns: [t.membershipId, t.memberId] }),
    index("membership_members_member").on(t.memberId),
]);

export const membershipPauses = pgTable("membership_pauses", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    membershipId: uuid("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
    startedAt: ts("started_at").notNull(),
    endedAt: ts("ended_at"),
    days: integer("days"),
    reason: text("reason"),
}, (t) => [index("membership_pauses_membership").on(t.membershipId, t.startedAt)]);

// Mongo `Client.paymentHistory` (embedded array).
export const payments = pgTable("payments", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id").references(() => memberships.id, { onDelete: "set null" }),
    amount: doublePrecision("amount"),
    method: text("method"),
    type: text("type").notNull().default("membership"),
    remarks: text("remarks"),
    paidAt: ts("paid_at").notNull().defaultNow(),
    collectedByUserId: uuid("collected_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
}, (t) => [
    index("payments_branch_paid").on(t.branchId, t.paidAt),
    index("payments_member").on(t.memberId, t.paidAt),
]);

export const activities = pgTable("activities", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    type: text("type"),
    title: text("title"),
    description: text("description"),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    amount: doublePrecision("amount"),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    date: ts("date").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    index("activities_branch_date").on(t.branchId, t.date),
    index("activities_member").on(t.memberId),
]);

// Login staff (front desk, trainer). The owner stays a users row with role `admin` and has no staff row.
export const staff = pgTable("staff", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    role: text("role").notNull(),
    shifts: jsonb("shifts").$type<{ start: string; end: string }[]>().notNull().default(sql`'[]'::jsonb`),
    weekOffs: integer("week_offs").array().notNull().default(sql`'{}'::integer[]`),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    index("staff_branch_active").on(t.branchId, t.active),
]);

export const biometricDevices = pgTable("biometric_devices", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    serialNumber: text("serial_number").notNull(),
    name: text("name").notNull().default("Entrance"),
    isActive: boolean("is_active").notNull().default(true),
    lastHeartbeatAt: ts("last_heartbeat_at"),
    lastCommandId: integer("last_command_id").notNull().default(0),
    nextPin: integer("next_pin").notNull().default(1001),
    createdAt: createdAt(),
}, (t) => [uniqueIndex("biometric_devices_serial").on(t.serialNumber)]);

export const deviceEnrollments = pgTable("device_enrollments", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    deviceId: uuid("device_id").notNull().references(() => biometricDevices.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "cascade" }),
    pin: integer("pin").notNull(),
    fingerprintStatus: text("fingerprint_status").notNull().default("none"),
    enrolledAt: ts("enrolled_at"),
}, (t) => [
    uniqueIndex("device_enrollments_pin").on(t.deviceId, t.pin),
    uniqueIndex("device_enrollments_member").on(t.deviceId, t.memberId),
    uniqueIndex("device_enrollments_staff").on(t.deviceId, t.staffId),
    check("device_enrollments_subject", sql`(${t.memberId} is null) <> (${t.staffId} is null)`),
]);

export const fingerprintTemplates = pgTable("fingerprint_templates", {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id").notNull().references(() => deviceEnrollments.id, { onDelete: "cascade" }),
    fid: integer("fid").notNull(),
    size: integer("size").notNull(),
    template: text("template").notNull(),
    onDevice: boolean("on_device").notNull().default(true),
}, (t) => [uniqueIndex("fingerprint_templates_finger").on(t.enrollmentId, t.fid)]);

export const deviceCommands = pgTable("device_commands", {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id").notNull().references(() => biometricDevices.id, { onDelete: "cascade" }),
    cmdId: integer("cmd_id").notNull(),
    type: text("type").notNull(),
    pin: integer("pin").notNull(),
    name: text("name"),
    payload: text("payload").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: createdAt(),
    sentAt: ts("sent_at"),
    ackedAt: ts("acked_at"),
}, (t) => [
    uniqueIndex("device_commands_once").on(t.deviceId, t.cmdId),
    index("device_commands_status").on(t.deviceId, t.status),
]);

export const attendance = pgTable("attendance", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    deviceId: uuid("device_id").references(() => biometricDevices.id, { onDelete: "set null" }),
    pin: integer("pin"),
    status: text("status").notNull(),
    denyReason: text("deny_reason"),
    punchedAt: ts("punched_at").notNull().defaultNow(),
}, (t) => [
    index("attendance_branch_time").on(t.branchId, t.punchedAt),
    index("attendance_member_time").on(t.memberId, t.punchedAt),
]);

// Append-only clock punches. A correction is a new punch or a void, never an edit.
export const staffAttendance = pgTable("staff_attendance", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
    punchedAt: ts("punched_at").notNull().defaultNow(),
    source: text("source").notNull().default("manual"),
    deviceId: uuid("device_id").references(() => biometricDevices.id, { onDelete: "set null" }),
    pin: integer("pin"),
    note: text("note"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    voidedAt: ts("voided_at"),
    voidedByUserId: uuid("voided_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
}, (t) => [
    index("staff_attendance_staff_time").on(t.staffId, t.punchedAt),
    index("staff_attendance_branch_time").on(t.branchId, t.punchedAt),
]);

export const messageLogs = pgTable("message_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    channel: text("channel").notNull().default("whatsapp"),
    // Automated sends and chat replies are `out`; webhook messages from members are `in`.
    direction: text("direction").notNull().default("out"),
    phone: text("phone"),
    body: text("body"),
    template: text("template"),
    status: text("status").notNull(),
    summary: text("summary"),
    providerMessageId: text("provider_message_id").unique(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    statusUpdatedAt: ts("status_updated_at"),
    seenAt: ts("seen_at"),
    sentByUserId: uuid("sent_by_user_id").references(() => users.id, { onDelete: "set null" }),
    sentAt: ts("sent_at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    index("message_logs_branch_sent").on(t.branchId, t.sentAt),
    index("message_logs_member_sent").on(t.memberId, t.sentAt),
    index("message_logs_branch_phone").on(t.branchId, t.phone, t.sentAt),
    index("message_logs_unread").on(t.branchId, t.direction, t.seenAt),
]);
