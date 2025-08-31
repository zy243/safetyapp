// models/Incident.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const incidentSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['safety', 'security', 'medical', 'other'],
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
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved', 'dismissed'],
        default: 'pending'
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
