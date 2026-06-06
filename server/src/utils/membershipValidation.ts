import {
    MEMBERSHIP_START_MAX_LOOKBACK_DAYS,
    MEMBERSHIP_START_MAX_FUTURE_DAYS,
} from './Constants.js';
import {
    getISTMidnightToday,
    parseToISTMidnight,
    calculateMembershipExpiry,
    addUtcDays,
} from './timeUtils.js';

export const validateMembershipStartDate = (startDateStr: string): { valid: boolean; error?: string; date?: Date } => {
    const today = getISTMidnightToday();
    const startDate = parseToISTMidnight(startDateStr);
    const minDate = addUtcDays(today, -MEMBERSHIP_START_MAX_LOOKBACK_DAYS);
    const maxDate = addUtcDays(today, MEMBERSHIP_START_MAX_FUTURE_DAYS);

    if (startDate < minDate) {
        return { valid: false, error: `Start date cannot be more than ${MEMBERSHIP_START_MAX_LOOKBACK_DAYS} days in the past.` };
    }
    if (startDate > maxDate) {
        return { valid: false, error: `Start date cannot be more than ${MEMBERSHIP_START_MAX_FUTURE_DAYS} days in the future.` };
    }
    return { valid: true, date: startDate };
};

export const validateMembershipNotExpiredOnCreate = (
    startDate: Date,
    durationInMonths: number,
    durationInDays: number
): { valid: boolean; error?: string; endDate?: Date } => {
    const today = getISTMidnightToday();
    const endDate = calculateMembershipExpiry(startDate, durationInMonths, durationInDays);

    if (endDate < today) {
        return {
            valid: false,
            error: 'Membership would already be expired. Use a later start date or shorter plan.',
            endDate,
        };
    }
    return { valid: true, endDate };
};

export const resolveAmountReceived = (
    amount: number,
    amountReceived?: number,
    paymentReceived?: boolean
): { received: number; error?: string } => {
    let received: number;
    if (amountReceived !== undefined && amountReceived !== null) {
        received = amountReceived;
    } else if (paymentReceived !== undefined) {
        received = paymentReceived ? amount : 0;
    } else {
        received = amount;
    }

    if (received < 0) {
        return { received: 0, error: 'Amount received cannot be negative.' };
    }
    if (received > amount) {
        return { received, error: 'Amount received cannot exceed total amount.' };
    }
    return { received };
};
