// models/Incident.js
import mongoose from 'mongoose';
import { INCIDENT_TYPES } from '../config/constants.js';


const { Schema } = mongoose;

const incidentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: Object.values(INCIDENT_TYPES),
        required: true,
        default: 'other'
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    coordinates: {
        type: [Number],
        required: true
    },
    address: String,
    building: String,
    floor: String,

    // 👇 these fields were misplaced
    isAnonymous: {
        type: Boolean,
        default: false
    },
    media: [{
        type: String // URLs to attached media
    }],

    status: {
        type: String,
        enum: ['reported', 'under_investigation', 'resolved', 'false_alarm'],
        default: 'reported'
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    notes: String,
    resolvedAt: Date
}, {
    timestamps: true
});


// ===== Indexes (duplicates removed) =====
incidentSchema.index({ status: 1, priority: 1 });
incidentSchema.index({ reportedBy: 1 });
incidentSchema.index({ 'location.lat': 1, 'location.lng': 1 });
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ type: 1, status: 1 });

// ===== Virtuals =====
incidentSchema.virtual('isResolved').get(function () {
    return this.status === 'resolved';
});

// ===== Methods =====
incidentSchema.methods.markResolved = function () {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    return this.save();
};

// ===== Prevent OverwriteModelError =====
const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);
export default Incident;
