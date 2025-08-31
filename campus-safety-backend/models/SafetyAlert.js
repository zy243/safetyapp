import mongoose from 'mongoose';

const safetyAlertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['theft', 'assault', 'fire', 'medical', 'weather', 'traffic', 'other'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    location: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        address: String,
        building: String,
        area: String
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'false_alarm'],
        default: 'active'
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    isEmergency: {
        type: Boolean,
        default: false
    },
    affectedArea: {
        radius: {
            type: Number,
            default: 1000 // meters
        },
        buildings: [String],
        areas: [String]
    },
    notifications: {
        pushSent: {
            type: Boolean,
            default: false
        },
        emailSent: {
            type: Boolean,
            default: false
        },
        smsSent: {
            type: Boolean,
            default: false
        }
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: Date,
    resolutionNotes: String
}, {
    timestamps: true
});

// Index for location-based queries
safetyAlertSchema.index({ location: '2dsphere' });
safetyAlertSchema.index({ status: 1, createdAt: -1 });
safetyAlertSchema.index({ category: 1, severity: 1 });

export default mongoose.model('SafetyAlert', safetyAlertSchema);




