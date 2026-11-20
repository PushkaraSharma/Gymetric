import { sql } from "drizzle-orm";
import {
    boolean,
    doublePrecision,
    index,
    integer,
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
});

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    phoneNumber: text("phone_number").unique(),
    firebaseUid: text("firebase_uid").unique(),
    username: text("username").unique(),
    passwordHash: text("password_hash"),
    role: text("role").notNull(),
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
    date: ts("date").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    index("activities_branch_date").on(t.branchId, t.date),
    index("activities_member").on(t.memberId),
]);

export const messageLogs = pgTable("message_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyMongoId: legacyId(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    channel: text("channel").notNull().default("whatsapp"),
    template: text("template"),
    status: text("status").notNull(),
    summary: text("summary"),
    providerMessageId: text("provider_message_id").unique(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    statusUpdatedAt: ts("status_updated_at"),
    sentAt: ts("sent_at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    index("message_logs_branch_sent").on(t.branchId, t.sentAt),
    index("message_logs_member_sent").on(t.memberId, t.sentAt),
]);
