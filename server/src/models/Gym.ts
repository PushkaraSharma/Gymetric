import mongoose from "mongoose";

const GymSchema = new mongoose.Schema({
    name: {type: String, required: true},
    address: String,
    ownerName: String,
    contactNumber: {type: String, required: true},
    email: String
}, {timestamps: true});

export default mongoose.models.Gym || mongoose.model('Gym', GymSchema);