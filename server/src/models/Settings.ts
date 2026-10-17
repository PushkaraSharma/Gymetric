import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, unique: true },
    whatsapp: {
        accessToken: { type: String, required: true },
        phoneNumberId: { type: String, required: true },
        active: { type: Boolean, default: false },
        // Permanent public HTTPS URL (Cloudinary/S3). Preferred over expiring Meta media IDs.
        headerImageUrl: { type: String, required: false },
        // Legacy fallback. Meta-hosted media IDs expire after about 30 days.
        headerImageId: { type: String, required: false },
        reminderDays: { type: Number, default: 1 },
        sendOnOnboarding: { type: Boolean, default: true },
        sendOnRenewal: { type: Boolean, default: true },
        sendOnExpiry: { type: Boolean, default: true },
        sendOnReminder: { type: Boolean, default: true }
    },
    receipt: {
        logo: String,
        signature: String,
        footerNote: { type: String, default: 'Thank you for training with us!' },
        showGymAddress: { type: Boolean, default: true },
    },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);