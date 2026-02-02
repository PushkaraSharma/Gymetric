import { Types } from 'mongoose';
import { MembershipStatus, PaymentMethod, ActivityType, OnboardingPurpose } from '../utils/Constants.js';

export interface IClient {
    _id: Types.ObjectId;
    name: string;
    phoneNumber: string;
    age?: number;
    birthday?: Date;
    anniversaryDate?: Date;
    onboardingPurpose?: OnboardingPurpose;
    gender?: 'Male' | 'Female' | 'Other';
    profilePicture?: string;
    gymId: Types.ObjectId;
    balance: number;
    role: 'primary' | 'dependent';
    membershipStatus: MembershipStatus;
    activeMembership?: Types.ObjectId;
    upcomingMembership?: Types.ObjectId;
    membershipHistory: Types.ObjectId[];
    paymentHistory: {
        membershipId?: Types.ObjectId;
        amount: number;
        method: PaymentMethod;
        date: Date;
        remarks?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IAssignedMembership {
    _id: Types.ObjectId;
    gymId: Types.ObjectId;
    primaryMemberId: Types.ObjectId;
    memberIds: Types.ObjectId[];
    planId: Types.ObjectId;
    planName: string;
    startDate: Date;
    endDate: Date;
    status: MembershipStatus;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMembershipPlan {
    _id: Types.ObjectId;
    gymId: Types.ObjectId;
    planName: string;
    durationInMonths: number;
    durationInDays: number;
    price: number;
    isTrial: boolean;
    planType: 'indivisual' | 'couple' | 'group';
    membersAllowed: number;
    description?: string;
    active: boolean;
    index: number;
}

export interface IActivity {
    _id: Types.ObjectId;
    gymId: Types.ObjectId;
    type: ActivityType;
    title: string;
    description: string;
    memberId?: Types.ObjectId;
    amount?: number;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IGym {
    _id: Types.ObjectId;
    name: string;
    ownerName: string;
    email: string;
    phoneNumber: string;
    address: string;
    logo?: string; // Cloudinary URL
}
