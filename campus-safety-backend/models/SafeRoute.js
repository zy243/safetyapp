import mongoose from 'mongoose';

const safeRouteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    startLocation: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        name: String
    },
    endLocation: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        name: String
    },
    waypoints: [{
        latitude: Number,
        longitude: Number,
        name: String,
        description: String
    }],
    routeType: {
        type: String,
        enum: ['walking', 'cycling', 'driving', 'public_transport'],
        default: 'walking'
    },
    safetyLevel: {
        type: String,
        enum: ['very_safe', 'safe', 'moderate', 'avoid'],
        default: 'safe'
    },
    features: {
        wellLit: {
            type: Boolean,
            default: false
        },
        populated: {
            type: Boolean,
            default: false
        },
        hasSecurity: {
            type: Boolean,
            default: false
        },
        hasEmergencyPhones: {
            type: Boolean,
            default: false
        },
        hasCCTV: {
            type: Boolean,
            default: false
        }
    },
    estimatedTime: {
        type: Number, // in minutes
        required: true
    },
    distance: {
        type: Number, // in meters
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    usageCount: {
        type: Number,
        default: 0
    },
    rating: {
        average: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Index for location-based queries
safeRouteSchema.index({ startLocation: '2dsphere' });
safeRouteSchema.index({ endLocation: '2dsphere' });
safeRouteSchema.index({ safetyLevel: 1, isActive: 1 });

export default mongoose.model('SafeRoute', safeRouteSchema);



