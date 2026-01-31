import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, unique: true },
    whatsapp: {
        accessToken: { type: String, required: true },
        phoneNumberId: { type: String, required: true },
        active: { type: Boolean, default: false },
        headerImageId: { type: String, required: false },
        reminderDays: { type: Number, default: 3 },
        sendOnOnboarding: { type: Boolean, default: true },
        sendOnRenewal: { type: Boolean, default: true },
        sendOnExpiry: { type: Boolean, default: true },
        sendOnReminder: { type: Boolean, default: true }
    },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);