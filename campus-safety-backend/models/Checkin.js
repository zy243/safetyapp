import mongoose from 'mongoose';

const checkinSchema = new mongoose.Schema({
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scheduledFor: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'missed', 'emergency'],
        default: 'pending'
    },
    completedAt: Date,
    response: {
        isSafe: Boolean,
        message: String,
        location: {
            lat: Number,
            lng: Number,
            address: String
        }
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    reminderSentAt: Date,
    notificationSent: {
        type: Boolean,
        default: false
    },
    notificationSentAt: Date
}, {
    timestamps: true
});

// Indexes, virtuals, methods, and statics omitted for brevity
// Keep your existing ones

// Prevent OverwriteModelError
const Checkin = mongoose.models.Checkin || mongoose.model('Checkin', checkinSchema);

export default Checkin;
