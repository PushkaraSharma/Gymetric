import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    age: Number,
    birthday: Date,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    // Membership Linking
    membershipHistory: [{
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memberships' },
        planName: String, // Snapshot in case plan name changes later
        startDate: Date,
        endDate: Date,
        amountPaid: Number,
        status: { type: String, enum: ['active', 'expired', 'cancelled'] }
    }],
    //payment transaction history
    paymentHistory: [{
        amount: Number,
        method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Transfer'] },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);