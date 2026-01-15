import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    age: Number,
    birthday: Date,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    membershipStatus: {type: String, enum: ['active', 'expired', 'cancelled', 'trial', 'trial_expired']},
    currentMembershipEndDate: Date,
    // Membership Linking
    membershipHistory: [{
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memberships' },
        planName: String, // Snapshot in case plan name changes later
        startDate: Date,
        endDate: Date,
        amount: Number,
        status: { type: String, enum: ['active', 'expired', 'cancelled', 'trial', 'trial_expired'] }
    }],
    //payment transaction history
    paymentHistory: [{
        amount: Number,
        method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Transfer'] },
        date: { type: Date, default: Date.now },
        remarks: String
    }],
    gymId: {type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true},
    balance: {type: Number, default: 0}
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);