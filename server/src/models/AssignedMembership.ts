import mongoose, { Schema, Document } from "mongoose";
import { MEMBERSHIP_TYPES } from "../utils/Constants.js";
import { IAssignedMembership } from "../types/models.js";

const AssignedMembershipSchema = new Schema<IAssignedMembership>({
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    primaryMemberId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
    planId: { type: Schema.Types.ObjectId, ref: 'Memberships' },
    planName: String,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: MEMBERSHIP_TYPES, required: true },
    totalAmount: { type: Number, required: true },
    pauseHistory: [{
        startedAt: { type: Date, required: true },
        endedAt: Date,
        days: Number,
        reason: String,
    }],
    totalPausedDays: { type: Number, default: 0 },
}, { timestamps: true });

// Add index for performance in expiry checks
AssignedMembershipSchema.index({ gymId: 1, status: 1, endDate: 1 });

export default mongoose.models.AssignedMembership || mongoose.model<IAssignedMembership>('AssignedMembership', AssignedMembershipSchema);