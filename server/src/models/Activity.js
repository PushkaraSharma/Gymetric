import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    type: { type: String, enum: ['ONBOARDING', 'RENEWAL', 'EXPIRY', 'PAYMENT', 'ADVANCE_RENEWAL'] },
    title: String,      // e.g., "New Member Joined"
    description: String, // e.g., "Rahul Sharma started a 3-month Gold Plan"
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    amount: Number,
    date: { type: Date, default: Date.now }
}, { timestamps: true });

ActivitySchema.index({date: 1}, {expireAfterSeconds: 60*60*24*90}); //expire logs after 90 days
export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);