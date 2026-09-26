import mongoose, { Schema } from "mongoose";

export type BiometricCommandType =
    | 'CREATE_USER'
    | 'ENABLE_USER'
    | 'DISABLE_USER'
    | 'DELETE_USER'
    | 'ENROLL_FP';

const CommandSchema = new Schema({
    cmdId: { type: Number, required: true },
    type: {
        type: String,
        enum: ['CREATE_USER', 'ENABLE_USER', 'DISABLE_USER', 'DELETE_USER', 'ENROLL_FP'],
        required: true,
    },
    pin: { type: String, required: true },
    name: String,
    payload: String,
    status: { type: String, enum: ['pending', 'sent', 'acked'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    sentAt: Date,
}, { _id: true });

const BiometricDeviceSchema = new Schema({
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    serialNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, default: 'Entrance' },
    isActive: { type: Boolean, default: true },
    lastHeartbeatAt: Date,
    lastCommandId: { type: Number, default: 0 },
    nextPin: { type: Number, default: 1001 },
    pendingCommands: { type: [CommandSchema], default: [] },
}, { timestamps: true });

BiometricDeviceSchema.index({ gymId: 1 });

export default mongoose.models.BiometricDevice
    || mongoose.model('BiometricDevice', BiometricDeviceSchema);
