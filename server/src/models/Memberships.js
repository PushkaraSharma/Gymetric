import mongoose from "mongoose";

const MembershipSchema = new mongoose.Schema({
    planName: { type: String, required: true }, // e.g., "Monthly Gold"
    durationInDays: { type: Number, default: 0}, // e.g., 30 in case of month -> 0
    durationInMonths: {type: Number, default: 0}, //used for motn wise membership renewal
    price: { type: Number, required: true },
    isTrial: { type: Boolean, default: false },
    planType: {type: String, enum: ['indivisual', 'couple', 'group'], default: 'indivisual'},
    membersAllowed: {type: Number, default: 1},
    gymId: {type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true},
    active: Boolean,
    description: String
});

export default mongoose.models.Memberships || mongoose.model('Memberships', MembershipSchema);