import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['escort_overdue', 'sos', 'checkin_missed', 'safety_alert']
    },
    message: {
        type: String,
        required: true
    },
    sessionId: String,
    guardians: [String],
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: Date,
    resolvedBy: String
}, {
    timestamps: true
});

alertSchema.index({ type: 1 });
alertSchema.index({ sessionId: 1 });
alertSchema.index({ resolved: 1 });

const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
export default Alert;
