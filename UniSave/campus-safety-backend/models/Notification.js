import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['safety_alert', 'emergency_broadcast', 'follow_me', 'sos', 'system', 'reminder'],
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    category: {
        type: String,
        enum: ['theft', 'assault', 'fire', 'medical', 'weather', 'traffic', 'other'],
        default: 'other'
    },
    data: {
        // Additional data for the notification
        alertId: mongoose.Schema.Types.ObjectId,
        location: {
            latitude: Number,
            longitude: Number,
            address: String
        },
        actionUrl: String,
        imageUrl: String
    },
    channels: {
        push: {
            sent: {
                type: Boolean,
                default: false
            },
            sentAt: Date,
            error: String
        },
        email: {
            sent: {
                type: Boolean,
                default: false
            },
            sentAt: Date,
            error: String
        },
        sms: {
            sent: {
                type: Boolean,
                default: false
            },
            sentAt: Date,
            error: String
        }
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'],
        default: 'pending'
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    expiresAt: Date,
    scheduledFor: Date
}, {
    timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, priority: 1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });

export default mongoose.model('Notification', notificationSchema);




