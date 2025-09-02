import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    startLocation: {
        lat: Number,
        lng: Number,
        address: String
    },
    currentLocation: {
        lat: Number,
        lng: Number,
        address: String,
        timestamp: Date
    },
    eta: {
        type: Number, // in minutes
        required: true
    },
    checkInInterval: {
        type: Number, // in minutes
        default: 5
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    trustedContacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    notes: String,
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    cancelledAt: Date,
    route: {
        polyline: String,
        distance: Number, // in meters
        duration: Number // in seconds
    }
}, {
    timestamps: true
});

// Indexes and virtuals omitted for brevity (keep your existing ones)

// Prevent OverwriteModelError
const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema);

export default Trip;
