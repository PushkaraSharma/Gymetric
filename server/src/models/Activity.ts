import mongoose, { Schema } from "mongoose";
import { IActivity } from "../types/models.js";
import { ACTIVITY_TYPES } from "../utils/Constants.js";

const ActivitySchema = new Schema<IActivity>({
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    type: { type: String, enum: ACTIVITY_TYPES },
    title: String,
    description: String,
    memberId: { type: Schema.Types.ObjectId, ref: 'Client' },
    amount: Number,
    date: { type: Date, default: Date.now }
}, { timestamps: true });

ActivitySchema.index({ date: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 days expiry

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);