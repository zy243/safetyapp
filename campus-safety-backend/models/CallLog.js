import mongoose from 'mongoose';

const CallLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sos: { type: mongoose.Schema.Types.ObjectId, ref: 'SOSAlert', default: null },
    type: { type: String, enum: ['voice', 'video', 'manual'], default: 'voice' },
    providerResponse: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

const CallLog = mongoose.models.CallLog || mongoose.model('CallLog', CallLogSchema);
export default CallLog;

