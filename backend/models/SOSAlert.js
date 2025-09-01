import mongoose from 'mongoose';
import { SOS_SEVERITY } from '../config/constants.js';

const SOSAlertSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: { type: String, default: 'Emergency SOS activated' },
    summary: { type: String },
    severity: {
        type: String,
        enum: Object.values(SOS_SEVERITY),
        default: SOS_SEVERITY.HIGH
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
        address: { type: String, default: 'Location not available' }
    },
    status: { type: String, enum: ['active', 'resolved', 'cancelled'], default: 'active' },
    triggeredBy: { type: String, enum: ['manual', 'automatic', 'guardian'], default: 'manual' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actions: {
        photoCaptured: { type: Boolean, default: false },
        videoRecording: { type: Boolean, default: false },
        locationObtained: { type: Boolean, default: false },
        contactsNotified: { type: Boolean, default: false }
    },
    media: {
        photos: [{ url: String, timestamp: Date }],
        videos: [{ url: String, duration: Number, timestamp: Date }]
    },
    emergencyServices: { called: { type: Boolean, default: false }, callTime: Date, referenceNumber: String },
    contacts: [{
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notifiedAt: Date,
        status: { type: String, enum: ['pending', 'notified', 'failed'], default: 'pending' }
    }],
    resolvedAt: Date,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// Indexes
SOSAlertSchema.index({ location: '2dsphere' });
SOSAlertSchema.index({ status: 1, createdAt: -1 });
SOSAlertSchema.index({ user: 1, createdAt: -1 });
SOSAlertSchema.index({ user: 1, status: 1 }); // FIXED

// Virtuals
SOSAlertSchema.virtual('formattedTime').get(function () {
    return this.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
});
SOSAlertSchema.virtual('duration').get(function () {
    if (this.resolvedAt) return Math.round((this.resolvedAt - this.createdAt) / 1000);
    return Math.round((Date.now() - this.createdAt) / 1000);
});

// Statics
SOSAlertSchema.statics.findActive = function () {
    return this.find({ status: 'active' })
        .populate('user', 'name phone email emergencyContacts')
        .populate('handledBy', 'name')
        .sort({ createdAt: -1 });
};

// Methods
SOSAlertSchema.methods.resolve = function (userId, notes = '') {
    this.status = 'resolved';
    this.handledBy = userId;
    this.resolvedAt = new Date();
    this.notes = notes;
    return this.save();
};

const SOSAlert = mongoose.models.SOSAlert || mongoose.model('SOSAlert', SOSAlertSchema);
export default SOSAlert;
