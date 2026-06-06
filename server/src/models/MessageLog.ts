import mongoose, { Schema } from 'mongoose';

const MessageLogSchema = new Schema({
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    channel: { type: String, enum: ['whatsapp'], default: 'whatsapp' },
    template: String,
    status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    summary: String,
    sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

MessageLogSchema.index({ gymId: 1, clientId: 1, sentAt: -1 });

export default mongoose.models.MessageLog || mongoose.model('MessageLog', MessageLogSchema);
