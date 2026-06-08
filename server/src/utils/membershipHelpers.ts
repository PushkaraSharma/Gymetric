import AssignedMembership from '../models/AssignedMembership.js';
import Client from '../models/Client.js';
import { getISTMidnightToday } from './timeUtils.js';
import { calculateMembershipExpiry } from './timeUtils.js';

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
    membership: any,
    membershipStatus: string,
    session?: any
) => {
    const isActive = ['active', 'trial', 'paused'].includes(membershipStatus);
    const isFuture = membershipStatus === 'future';

    for (const memberId of membership.memberIds) {
        const client = await Client.findById(memberId).session(session || null);
        if (!client) continue;

        client.membershipStatus = membershipStatus as any;
        if (isActive || membershipStatus === 'paused') {
            client.activeMembership = membership._id;
            if (String(client.upcomingMembership) === String(membership._id)) {
                client.upcomingMembership = undefined;
            }
        } else if (isFuture) {
            client.upcomingMembership = membership._id;
            if (String(client.activeMembership) === String(membership._id)) {
                client.activeMembership = undefined;
            }
        } else {
            if (String(client.activeMembership) === String(membership._id)) {
                client.activeMembership = undefined;
                client.membershipStatus = membershipStatus as any;
            }
            if (String(client.upcomingMembership) === String(membership._id)) {
                client.upcomingMembership = undefined;
            }
        }
        await client.save({ session });
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
