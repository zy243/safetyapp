import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['sos', 'safety_alert', 'system'], required: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    data: { alertId: mongoose.Schema.Types.ObjectId, location: { latitude: Number, longitude: Number } },
    read: { type: Boolean, default: false }
}, { timestamps: true });

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export default Notification;

