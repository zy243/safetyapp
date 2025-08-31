// models/SOSAlert.js
import mongoose from 'mongoose';

// Define the schema
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

// Create the model
const SOSAlert = mongoose.model('SOSAlert', SOSAlertSchema);

// Export the model (ESM)
export default SOSAlert;
