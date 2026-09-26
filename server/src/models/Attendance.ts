import mongoose, { Schema } from "mongoose";

const AttendanceSchema = new Schema({
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    biometricPin: { type: String, required: true },
    personType: { type: String, enum: ['member', 'staff', 'unknown'], default: 'member' },
    status: { type: String, enum: ['granted', 'denied', 'manual'], required: true },
    denyReason: String,
    source: { type: String, enum: ['device', 'manual', 'simulator'], default: 'device' },
    deviceSn: String,
    punchedAt: { type: Date, required: true },
    deviceTime: String,
    recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

AttendanceSchema.index({ gymId: 1, punchedAt: -1 });
AttendanceSchema.index({ gymId: 1, clientId: 1, punchedAt: -1 });
AttendanceSchema.index({ gymId: 1, biometricPin: 1, punchedAt: -1 });

export default mongoose.models.Attendance
    || mongoose.model('Attendance', AttendanceSchema);
