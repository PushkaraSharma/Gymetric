import mongoose from "mongoose";
import { MEMBERSHIP_TYPES } from "../utils/Constants.js";

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    age: Number,
    birthday: Date,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    balance: { type: Number, default: 0 },
    role: {type: String, enum: ['primary', 'dependent'], default: 'primary'},
    membershipStatus: { type: String, enum: MEMBERSHIP_TYPES },
    activeMembership: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedMembership' },
    upcomingMembership: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedMembership' },
    membershipHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AssignedMembership' }],
    paymentHistory: [{
        membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedMembership' }, //maybe useful later
        amount: Number,
        method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Transfer'] },
        date: { type: Date, default: Date.now },
        remarks: String
    }],

}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);