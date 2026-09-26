import mongoose from "mongoose";

const GymSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: String,
    ownerName: String,
    contactNumber: { type: String, required: true },
    email: String,
    logo: { type: String },
    /** Fingerprint attendance. Off until the gym pairs an entrance reader. */
    attendanceEnabled: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Gym || mongoose.model('Gym', GymSchema);