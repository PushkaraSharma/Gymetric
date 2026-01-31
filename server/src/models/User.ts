import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    passwordHash: {type: String, default: null},
    role: {type: String, enum: ['admin', 'staff'], required: true},
    permissions: {type: [String], default: []},
    gymId: {type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true},
    isActive: {type: Boolean, default: null},
}, {timestamps: true});

export default mongoose.models.User || mongoose.model('User', UserSchema);