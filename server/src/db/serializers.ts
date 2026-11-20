import type { InferSelectModel } from "drizzle-orm";
import type {
    activities,
    branches,
    branchSettings,
    memberships,
    membershipPauses,
    members,
    messageLogs,
    packages,
    payments,
    users,
} from "./schema.js";

// The mobile app was built against Mongoose JSON: `_id` keys and absent (not null) optional fields.
// These helpers keep that exact shape so the app needs no change.

export type BranchRow = InferSelectModel<typeof branches>;
export type PackageRow = InferSelectModel<typeof packages>;
export type MemberRow = InferSelectModel<typeof members>;
export type MembershipRow = InferSelectModel<typeof memberships>;
export type PauseRow = InferSelectModel<typeof membershipPauses>;
export type PaymentRow = InferSelectModel<typeof payments>;
export type ActivityRow = InferSelectModel<typeof activities>;
export type SettingsRow = InferSelectModel<typeof branchSettings>;
export type UserRow = InferSelectModel<typeof users>;
export type MessageLogRow = InferSelectModel<typeof messageLogs>;

export const compact = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) out[key] = value;
    }
    return out as Partial<T>;
};

export const serializeGym = (b: BranchRow) => compact({
    _id: b.id,
    name: b.name,
    address: b.address,
    ownerName: b.ownerName,
    contactNumber: b.contactNumber,
    email: b.email,
    logo: b.logo,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
});

export const serializePlan = (p: PackageRow) => compact({
    _id: p.id,
    planName: p.planName,
    durationInDays: p.durationInDays,
    durationInMonths: p.durationInMonths,
    price: p.price,
    isTrial: p.isTrial,
    planType: p.planType,
    membersAllowed: p.membersAllowed,
    gymId: p.branchId,
    active: p.active,
    description: p.description,
    index: p.sortIndex,
});

export const serializePayment = (p: PaymentRow) => compact({
    _id: p.id,
    membershipId: p.membershipId,
    amount: p.amount,
    method: p.method,
    date: p.paidAt,
    remarks: p.remarks,
    type: p.type,
});

export const serializePause = (p: PauseRow) => compact({
    _id: p.id,
    startedAt: p.startedAt,
    endedAt: p.endedAt,
    days: p.days,
    reason: p.reason,
});

export const serializeMembership = (
    m: MembershipRow,
    extra: { memberIds?: string[]; pauses?: PauseRow[] } = {},
) => compact({
    _id: m.id,
    gymId: m.branchId,
    primaryMemberId: m.primaryMemberId,
    memberIds: extra.memberIds,
    planId: m.packageId,
    planName: m.planName,
    startDate: m.startDate,
    endDate: m.endDate,
    status: m.status,
    totalAmount: m.totalAmount,
    pauseHistory: extra.pauses?.map(serializePause),
    totalPausedDays: m.totalPausedDays,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
});

export const serializeActivity = (a: ActivityRow) => compact({
    _id: a.id,
    gymId: a.branchId,
    type: a.type,
    title: a.title,
    description: a.description,
    memberId: a.memberId,
    amount: a.amount,
    date: a.date,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
});

export const serializeMember = (
    m: MemberRow,
    extra: {
        activeMembership?: unknown;
        upcomingMembership?: unknown;
        membershipHistory?: unknown[];
        paymentHistory?: unknown[];
    } = {},
) => compact({
    _id: m.id,
    name: m.name,
    phoneNumber: m.phoneNumber,
    age: m.age,
    birthday: m.birthday,
    anniversaryDate: m.anniversaryDate,
    onboardingPurpose: m.onboardingPurpose,
    gender: m.gender,
    profilePicture: m.profilePicture,
    gymId: m.branchId,
    balance: m.balance,
    isSeeded: m.isSeeded,
    role: m.role,
    membershipStatus: m.membershipStatus,
    activeMembership: extra.activeMembership === undefined ? m.activeMembershipId : extra.activeMembership,
    upcomingMembership: extra.upcomingMembership === undefined ? m.upcomingMembershipId : extra.upcomingMembership,
    membershipHistory: extra.membershipHistory,
    paymentHistory: extra.paymentHistory,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
});

export const serializeSettings = (s: SettingsRow, opts: { includeSecrets?: boolean } = {}) => ({
    _id: s.id,
    gymId: s.branchId,
    whatsapp: compact({
        accessToken: opts.includeSecrets ? s.whatsappAccessToken : undefined,
        phoneNumberId: opts.includeSecrets ? s.whatsappPhoneNumberId : undefined,
        active: s.whatsappActive,
        headerImageUrl: s.whatsappHeaderImageUrl,
        headerImageId: s.whatsappHeaderImageId,
        reminderDays: s.whatsappReminderDays,
        sendOnOnboarding: s.whatsappSendOnOnboarding,
        sendOnRenewal: s.whatsappSendOnRenewal,
        sendOnExpiry: s.whatsappSendOnExpiry,
        sendOnReminder: s.whatsappSendOnReminder,
    }),
    receipt: compact({
        logo: s.receiptLogo,
        signature: s.receiptSignature,
        footerNote: s.receiptFooterNote,
        showGymAddress: s.receiptShowGymAddress,
    }),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
});

// Shape the WhatsApp sender expects (formerly the Mongo `settings.whatsapp` subdocument).
export const whatsappConfig = (s: SettingsRow) => ({
    accessToken: s.whatsappAccessToken,
    phoneNumberId: s.whatsappPhoneNumberId,
    active: s.whatsappActive,
    headerImageUrl: s.whatsappHeaderImageUrl,
    headerImageId: s.whatsappHeaderImageId,
    reminderDays: s.whatsappReminderDays,
    sendOnOnboarding: s.whatsappSendOnOnboarding,
    sendOnRenewal: s.whatsappSendOnRenewal,
    sendOnExpiry: s.whatsappSendOnExpiry,
    sendOnReminder: s.whatsappSendOnReminder,
});

export const serializePushPrefs = (u: UserRow) => ({
    _id: u.id,
    pushNotificationsEnabled: u.pushNotificationsEnabled,
    pushPrefs: {
        expiringToday: u.pushExpiringToday,
        expiringSoon: u.pushExpiringSoon,
        outstandingBalance: u.pushOutstandingBalance,
        dailySummary: u.pushDailySummary,
    },
});
