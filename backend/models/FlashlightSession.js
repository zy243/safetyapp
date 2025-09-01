import mongoose from 'mongoose';

const flashlightSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    duration: {
        type: Number, // in seconds
        required: true,
        min: 30, // minimum 30 seconds
        max: 3600 // maximum 1 hour
    },
    intensity: {
        type: Number, // percentage 0-100
        required: true,
        min: 0,
        max: 100
    },
    pattern: {
        type: String,
        enum: ['steady', 'strobe', 'sos', 'pulse', 'custom'],
        default: 'steady'
    },
    customPattern: {
        onDuration: Number, // milliseconds
        offDuration: Number, // milliseconds
        repeat: Number
    },
    status: {
        type: String,
        enum: ['active', 'stopped', 'completed', 'cancelled'],
        default: 'active'
    },
    isEmergency: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: Date,
    batteryLevelAtStart: Number,
    batteryLevelAtEnd: Number
}, {
    timestamps: true
});

// Indexes
flashlightSessionSchema.index({ user: 1, status: 1 });
flashlightSessionSchema.index({ createdAt: 1 });
flashlightSessionSchema.index({ isEmergency: 1 });

// Virtual for time remaining
flashlightSessionSchema.virtual('timeRemaining').get(function () {
    if (this.status !== 'active' || !this.startedAt) return 0;

    const elapsed = (new Date() - this.startedAt) / 1000;
    return Math.max(0, this.duration - elapsed);
});

// Virtual for isActive
flashlightSessionSchema.virtual('isActive').get(function () {
    return this.status === 'active' && this.timeRemaining > 0;
});

// Pre-save middleware to auto-complete expired sessions
flashlightSessionSchema.pre('save', function (next) {
    if (this.status === 'active' && this.timeRemaining <= 0) {
        this.status = 'completed';
        this.endedAt = new Date();
    }
    next();
});

// Static method to find expired sessions
flashlightSessionSchema.statics.findExpired = function () {
    return this.find({
        status: 'active',
        startedAt: {
            $lt: new Date(Date.now() - 3600000) // older than 1 hour
        }
    });
};

// Instance method to stop session
flashlightSessionSchema.methods.stop = function () {
    this.status = 'stopped';
    this.endedAt = new Date();
    return this.save();
};

// Prevent OverwriteModelError
const FlashlightSession = mongoose.models.FlashlightSession || mongoose.model('FlashlightSession', flashlightSessionSchema);

export default FlashlightSession;
