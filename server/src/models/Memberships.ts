import mongoose, { Schema } from "mongoose";
import { IMembershipPlan } from "../types/models.js";

const MembershipSchema = new Schema<IMembershipPlan>({
    planName: { type: String, required: true },
    durationInDays: { type: Number, default: 0 },
    durationInMonths: { type: Number, default: 0 },
    price: { type: Number, required: true },
    isTrial: { type: Boolean, default: false },
    planType: { type: String, enum: ['indivisual', 'couple', 'group'], default: 'indivisual' },
    membersAllowed: { type: Number, default: 1 },
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    active: { type: Boolean, default: true },
    description: String,
    index: { type: Number, default: 0 }
});

export default mongoose.models.Memberships || mongoose.model<IMembershipPlan>('Memberships', MembershipSchema);