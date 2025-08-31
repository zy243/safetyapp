import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: String, required: true }, // client-generated device id
    platform: { type: String, enum: ['android', 'ios', 'web'], default: 'web' },
    pushToken: { type: String, default: '' }, // for push notifications
    createdAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now }
});

DeviceSchema.index({ deviceId: 1, user: 1 }, { unique: true });

const Device = mongoose.models.Device || mongoose.model('Device', DeviceSchema);
export default Device;

