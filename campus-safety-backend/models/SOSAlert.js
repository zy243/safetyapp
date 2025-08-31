import mongoose from 'mongoose';

const SOSAlertSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        default: 'Emergency SOS activated'
    },
    summary: {
        type: String
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'high'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    address: {
        type: String,
        default: 'Location not available'
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'cancelled'],
        default: 'active'
    },
    triggeredBy: {
        type: String,
        enum: ['voice', 'button', 'shake', 'manual', 'automatic'],
        default: 'manual'
    },
    handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // New fields for enhanced SOS functionality
    actions: {
        photoCaptured: { type: Boolean, default: false },
        videoRecording: { type: Boolean, default: false },
        locationObtained: { type: Boolean, default: false },
        contactsNotified: { type: Boolean, default: false }
    },
    media: {
        photos: [{
            url: String,
            timestamp: Date
        }],
        videos: [{
            url: String,
            duration: Number,
            timestamp: Date
        }]
    },
    emergencyServices: {
        called: { type: Boolean, default: false },
        callTime: Date,
        referenceNumber: String
    },
    contacts: [{
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notifiedAt: Date,
        status: { type: String, enum: ['pending', 'notified', 'failed'], default: 'pending' }
    }],
    resolvedAt: Date,
    notes: String
}, {
    timestamps: true
});

SOSAlertSchema.index({ location: '2dsphere' });
SOSAlertSchema.index({ status: 1, createdAt: -1 });
SOSAlertSchema.index({ user: 1, createdAt: -1 });

// Virtual for formatted time
SOSAlertSchema.virtual('formattedTime').get(function () {
    return this.createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
});

// Virtual for duration
SOSAlertSchema.virtual('duration').get(function () {
    if (this.resolvedAt) {
        return Math.round((this.resolvedAt - this.createdAt) / 1000); // seconds
    }
    return Math.round((Date.now() - this.createdAt) / 1000);
});

// Static method to find active alerts
SOSAlertSchema.statics.findActive = function () {
    return this.find({ status: 'active' })
        .populate('user', 'name phone email emergencyContacts')
        .populate('handledBy', 'name')
        .sort({ createdAt: -1 });
};

// Instance method to resolve alert
SOSAlertSchema.methods.resolve = function (userId, notes = '') {
    this.status = 'resolved';
    this.handledBy = userId;
    this.resolvedAt = new Date();
    this.notes = notes;
    return this.save();
};

const SOSAlert = mongoose.models.SOSAlert || mongoose.model('SOSAlert', SOSAlertSchema);
export default SOSAlert;
