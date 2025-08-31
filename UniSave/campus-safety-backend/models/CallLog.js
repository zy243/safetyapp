import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const CallLogSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sos: { type: Schema.Types.ObjectId, ref: 'SOSAlert', default: null },
    type: { type: String, enum: ['voice', 'video', 'manual'], default: 'voice' },
    providerResponse: { type: Schema.Types.Mixed }, // store API response from telephony provider
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('CallLog', CallLogSchema);
