export const MEMBERSHIP_TYPES = ['active', 'expired', 'cancelled', 'trial', 'trial_expired', 'pending', 'future'] as const;

export type MembershipStatus = typeof MEMBERSHIP_TYPES[number];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Transfer'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const ACTIVITY_TYPES = ['ONBOARDING', 'RENEWAL', 'ADVANCE_RENEWAL', 'EXPIRY', 'PAYMENT'] as const;
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
