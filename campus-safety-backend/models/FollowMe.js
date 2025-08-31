import mongoose from 'mongoose';

const followMeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    sharingWith: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    currentLocation: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        accuracy: Number,
        timestamp: {
            type: Date,
            default: Date.now
        },
        address: String
    },
    locationHistory: [{
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        timestamp: {
            type: Date,
            default: Date.now
        },
        address: String
    }],
    settings: {
        updateInterval: {
            type: Number,
            default: 30 // seconds
        },
        maxHistoryPoints: {
            type: Number,
            default: 100
        },
        shareLocation: {
            type: Boolean,
            default: true
        },
        shareAddress: {
            type: Boolean,
            default: true
        }
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'stopped'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for efficient queries
followMeSchema.index({ user: 1, isActive: 1 });
followMeSchema.index({ 'sharingWith.userId': 1 });
followMeSchema.index({ expiresAt: 1 });

export default mongoose.model('FollowMe', followMeSchema);




