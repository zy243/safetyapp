import mongoose from 'mongoose';

const escortSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    userName: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    durationMinutes: {
        type: Number,
        required: true
    },
    expectedEnd: {
        type: Date,
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'overdue'],
        default: 'active'
    },
    guardianEmails: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    shareToken: {
        type: String,
        required: true
    },
    completedAt: {
        type: Date
    },
    alertedAt: {
        type: Date
    },
    notes: String
}, {
    timestamps: true
});

// Indexes for better query performance
escortSchema.index({ id: 1 });
escortSchema.index({ userName: 1 });
escortSchema.index({ status: 1 });
escortSchema.index({ shareToken: 1 });
escortSchema.index({ expectedEnd: 1 });

// Static method to find overdue escorts
escortSchema.statics.findOverdue = function () {
    const now = new Date();
    return this.find({
        status: 'active',
        expectedEnd: { $lt: now }
    });
};

// Instance method to mark as complete
escortSchema.methods.markComplete = function () {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
};

// Instance method to mark as cancelled
escortSchema.methods.markCancelled = function () {
    this.status = 'cancelled';
    this.completedAt = new Date();
    return this.save();
};

// Instance method to mark as overdue
escortSchema.methods.markOverdue = function () {
    this.status = 'overdue';
    this.alertedAt = new Date();
    return this.save();
};

const Escort = mongoose.models.Escort || mongoose.model('Escort', escortSchema);
export default Escort;
