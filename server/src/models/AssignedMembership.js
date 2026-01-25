import mongoose from "mongoose";
import { MEMBERSHIP_TYPES } from "../utils/Constants.js";

const AssignedMembershipSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    primaryMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }], // All people in group
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memberships' }, // Reference to your Plan Template
    planName: String,
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: MEMBERSHIP_TYPES },
    totalAmount: Number
}, { timestamps: true });

export default mongoose.models.AssignedMembership || mongoose.model('AssignedMembership', AssignedMembershipSchema);