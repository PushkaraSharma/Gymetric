import mongoose, { Schema } from "mongoose";
import { MEMBERSHIP_TYPES, ONBOARDING_PURPOSES } from "../utils/Constants.js";
import { IClient } from "../types/models.js";

const ClientSchema = new Schema<IClient>({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    age: Number,
    birthday: Date,
    anniversaryDate: Date,
    onboardingPurpose: { type: String, enum: ONBOARDING_PURPOSES, default: 'General Fitness' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    profilePicture: { type: String }, // Cloudinary URL
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    balance: { type: Number, default: 0 },
    role: { type: String, enum: ['primary', 'dependent'], default: 'primary' },
    membershipStatus: { type: String, enum: MEMBERSHIP_TYPES },
    activeMembership: { type: Schema.Types.ObjectId, ref: 'AssignedMembership' },
    upcomingMembership: { type: Schema.Types.ObjectId, ref: 'AssignedMembership' },
    membershipHistory: [{ type: Schema.Types.ObjectId, ref: 'AssignedMembership' }],
    paymentHistory: [{
        membershipId: { type: Schema.Types.ObjectId, ref: 'AssignedMembership' },
        amount: Number,
        method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Transfer'] },
        date: { type: Date, default: Date.now },
        remarks: String
    }],
}, { timestamps: true });

// Index for lookup by phone and gym (Needs to be unique per gym)
ClientSchema.index({ gymId: 1, phoneNumber: 1 }, { unique: true });

export default mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);