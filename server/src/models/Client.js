import mongoose from "mongoose";
import { MEMBERSHIP_TYPES } from "../utils/Constants.js";

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    age: Number,
    birthday: Date,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    membershipStatus: { type: String, enum: MEMBERSHIP_TYPES },
    currentEndDate: Date,
    activeMembership: {
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memberships' },
        planName: String,
        startDate: Date,
        endDate: Date,
        amount: Number,
        status: { type: String, enum: MEMBERSHIP_TYPES }
    },
    upcomingMembership: {
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memberships' },
        planName: String,
        startDate: Date,
        endDate: Date,
        amount: Number,
        status: { type: String, enum: MEMBERSHIP_TYPES }
    },
    membershipHistory: [{
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memberships' },
        planName: String, // Snapshot in case plan name changes later
        startDate: Date,
        endDate: Date,
        amount: Number,
        status: { type: String, enum: MEMBERSHIP_TYPES }
    }],
    paymentHistory: [{
        amount: Number,
        method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Transfer'] },
        date: { type: Date, default: Date.now },
        remarks: String
    }],
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    balance: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);