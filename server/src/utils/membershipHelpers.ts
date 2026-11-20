import { eq } from 'drizzle-orm';
import type { Executor } from '../db/client.js';
import { members } from '../db/schema.js';
import { findMember, memberIdsFor } from '../db/queries.js';
import { getISTMidnightToday } from './timeUtils.js';

export const deriveMembershipStatus = (
    startDate: Date,
    endDate: Date,
    isTrial: boolean,
    today: Date = getISTMidnightToday()
): string => {
    if (startDate > today) return 'future';
    if (endDate < today) return isTrial ? 'trial_expired' : 'expired';
    if (isTrial) return 'trial';
    return 'active';
};

export const syncMembersForMembership = async (
    exec: Executor,
    membershipId: string,
    membershipStatus: string,
) => {
    const isActive = ['active', 'trial', 'paused'].includes(membershipStatus);
    const isFuture = membershipStatus === 'future';

    for (const memberId of await memberIdsFor(exec, membershipId)) {
        const client = await findMember(exec, memberId);
        if (!client) continue;

        const update: Partial<typeof members.$inferInsert> = { membershipStatus, updatedAt: new Date() };
        if (isActive) {
            update.activeMembershipId = membershipId;
            if (client.upcomingMembershipId === membershipId) update.upcomingMembershipId = null;
        } else if (isFuture) {
            update.upcomingMembershipId = membershipId;
            if (client.activeMembershipId === membershipId) update.activeMembershipId = null;
        } else {
            if (client.activeMembershipId === membershipId) update.activeMembershipId = null;
            if (client.upcomingMembershipId === membershipId) update.upcomingMembershipId = null;
        }
        await exec.update(members).set(update).where(eq(members.id, client.id));
    }
};

export const getMembershipStatusFromDates = (
    startDate: Date,
    endDate: Date,
    planIsTrial: boolean,
    currentStatus?: string
): string => {
    const today = getISTMidnightToday();
    if (currentStatus === 'paused') return 'paused';
    if (startDate > today) return 'future';
    if (endDate < today) return planIsTrial ? 'trial_expired' : 'expired';
    if (planIsTrial) return 'trial';
    return 'active';
};
