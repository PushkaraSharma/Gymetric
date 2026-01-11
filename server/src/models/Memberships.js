import mongoose from "mongoose";

const MembershipSchema = new mongoose.Schema({
    planName: { type: String, required: true }, // e.g., "Monthly Gold"
    durationInDays: { type: Number, required: true }, // e.g., 30
    price: { type: Number, required: true },
    isTrial: { type: Boolean, default: false },
    gymId: {type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true},
    active: Boolean
});

export default mongoose.models.Memberships || mongoose.model('Memberships', MembershipSchema);