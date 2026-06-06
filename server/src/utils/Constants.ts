export const MEMBERSHIP_TYPES = ['active', 'expired', 'cancelled', 'trial', 'trial_expired', 'pending', 'future', 'paused'] as const;

export const MEMBERSHIP_START_MAX_LOOKBACK_DAYS = 365;
export const MEMBERSHIP_START_MAX_FUTURE_DAYS = 365;
export const STALE_WHATSAPP_SKIP_DAYS = 7;

export type MembershipStatus = typeof MEMBERSHIP_TYPES[number];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Transfer'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const ACTIVITY_TYPES = ['ONBOARDING', 'RENEWAL', 'ADVANCE_RENEWAL', 'EXPIRY', 'PAYMENT', 'MEMBERSHIP_AMENDED', 'PAUSE', 'RESUME', 'WHATSAPP'] as const;

export const PAYMENT_TYPES = ['membership', 'balance_collection'] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];
export type ActivityType = typeof ACTIVITY_TYPES[number];

export const ONBOARDING_PURPOSES = [
    'Fat Loss',
    'Muscle Building',
    'General Fitness',
    'Weight Gain',
    'Flexibility',
    'Athletic Performance',
    'Rehabilitation',
    'Stress Relief'
] as const;
export type OnboardingPurpose = typeof ONBOARDING_PURPOSES[number];
