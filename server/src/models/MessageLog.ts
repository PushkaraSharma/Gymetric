import mongoose, { Schema } from 'mongoose';

export const MESSAGE_LOG_STATUSES = [
    'queued',
    'sent',
    'delivered',
    'read',
    'failed',
    'skipped',
] as const;

const MessageLogSchema = new Schema({
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    channel: { type: String, enum: ['whatsapp'], default: 'whatsapp' },
    template: String,
    status: { type: String, enum: MESSAGE_LOG_STATUSES, required: true },
    summary: String,
    providerMessageId: { type: String },
    errorCode: { type: String },
    errorMessage: { type: String },
    statusUpdatedAt: { type: Date },
    sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

MessageLogSchema.index({ gymId: 1, clientId: 1, sentAt: -1 });
MessageLogSchema.index({ gymId: 1, sentAt: -1 });
MessageLogSchema.index({ providerMessageId: 1 }, { unique: true, sparse: true });

export default mongoose.models.MessageLog || mongoose.model('MessageLog', MessageLogSchema);
