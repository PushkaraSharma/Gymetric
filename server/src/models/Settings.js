import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId,  ref: 'Gym', required: true, unique: true },
    whatsapp: {
        accessToken: { type: String, required: true },
        phoneNumberId: { type: String, required: true },
        isActive: { type: Boolean, default: false }
    },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);