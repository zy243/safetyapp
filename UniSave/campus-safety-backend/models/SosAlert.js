// models/SOSAlert.js
import mongoose from 'mongoose';

const SOSAlertSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        latitude: {
            type: Number,
            required: true,
        },
        longitude: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'resolved'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

// ✅ Safer fix
export default mongoose.modelNames().includes('SOSAlert')
    ? mongoose.model('SOSAlert')
    : mongoose.model('SOSAlert', SOSAlertSchema);
