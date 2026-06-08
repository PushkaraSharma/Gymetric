import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true, required: true },  // NEW: primary identifier
    firebaseUid: { type: String, unique: true, sparse: true },    // NEW: Firebase UID

    username: { type: String, unique: true, sparse: true },         // Sparse for backward compatibility
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ['admin', 'staff'], required: true },
    permissions: { type: [String], default: [] },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    isActive: { type: Boolean, default: true },
    expoPushToken: String,
    pushNotificationsEnabled: { type: Boolean, default: true },
    pushPrefs: {
        expiringToday: { type: Boolean, default: true },
        expiringSoon: { type: Boolean, default: true },
        outstandingBalance: { type: Boolean, default: true },
        dailySummary: { type: Boolean, default: true },
    },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);