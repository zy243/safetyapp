import mongoose from 'mongoose';

const guardianSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    destinationCoords: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    estimatedDuration: {
        type: Number, // in minutes
        required: true
    },
    trustedContacts: [{
        contact: { type: mongoose.Schema.Types.ObjectId, ref: 'TrustedContact' },
        notified: { type: Boolean, default: false }
    }],
    checkIns: [{
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: [Number]
        },
        timestamp: { type: Date, default: Date.now },
        status: { type: String, enum: ['on_time', 'delayed', 'emergency'], default: 'on_time' },
        message: String
    }],
    currentStatus: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'overdue', 'emergency'],
        default: 'active'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    routeDeviations: [{
        timestamp: Date,
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: [Number]
        },
        distanceFromRoute: Number // in meters
    }],
    alertsSent: [{
        type: {
            type: String,
            enum: ['route_deviation', 'unusual_stop', 'overdue', 'emergency']
        },
        timestamp: Date,
        message: String,
        sentTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TrustedContact' }]
    }]
}, {
    timestamps: true
});

guardianSessionSchema.index({ user: 1, currentStatus: 1 });

export default mongoose.model('GuardianSession', guardianSessionSchema);