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

// Index for better query performance
tripSchema.index({ user: 1, status: 1 });
tripSchema.index({ status: 1, createdAt: 1 });
tripSchema.index({ trustedContacts: 1 });

// Virtual for estimated completion time
tripSchema.virtual('estimatedCompletion').get(function () {
    if (!this.startedAt) return null;
    const completionTime = new Date(this.startedAt);
    completionTime.setMinutes(completionTime.getMinutes() + this.eta);
    return completionTime;
});

// Virtual for timeRemaining (in minutes)
tripSchema.virtual('timeRemaining').get(function () {
    if (!this.startedAt || this.status !== 'active') return 0;
    const elapsed = (new Date() - this.startedAt) / 60000; // minutes
    return Math.max(0, this.eta - elapsed);
});

// Virtual for isOverdue
tripSchema.virtual('isOverdue').get(function () {
    if (this.status !== 'active' || !this.startedAt) return false;
    const expectedEnd = new Date(this.startedAt);
    expectedEnd.setMinutes(expectedEnd.getMinutes() + this.eta);
    return new Date() > expectedEnd;
});

// Pre-save middleware
tripSchema.pre('save', function (next) {
    if (this.status === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }
    if (this.status === 'cancelled' && !this.cancelledAt) {
        this.cancelledAt = new Date();
    }
    next();
});

// Static method to find active trips for a user
tripSchema.statics.findActiveByUser = function (userId) {
    return this.find({ user: userId, status: 'active' })
        .populate('trustedContacts', 'name email phone')
        .sort({ createdAt: -1 });
};

// Static method to find trips by trusted contact
tripSchema.statics.findByTrustedContact = function (contactId) {
    return this.find({
        trustedContacts: contactId,
        status: 'active'
    }).populate('user', 'name email phone').populate('trustedContacts', 'name email phone');
};

// Instance method to update progress
tripSchema.methods.updateProgress = function (newProgress, location = null) {
    this.progress = Math.min(100, Math.max(0, newProgress));

    if (location) {
        this.currentLocation = {
            lat: location.lat,
            lng: location.lng,
            address: location.address,
            timestamp: new Date()
        };
    }

    if (this.progress >= 100 && this.status === 'active') {
        this.status = 'completed';
        this.completedAt = new Date();
    }

    return this.save();
};

// Instance method to add trusted contact
tripSchema.methods.addTrustedContact = function (contactId) {
    if (!this.trustedContacts.includes(contactId)) {
        this.trustedContacts.push(contactId);
    }
    return this.save();
};

// Instance method to remove trusted contact
tripSchema.methods.removeTrustedContact = function (contactId) {
    this.trustedContacts = this.trustedContacts.filter(
        contact => contact.toString() !== contactId.toString()
    );
    return this.save();
};

// Remove sensitive information from JSON output
tripSchema.methods.toJSON = function () {
    const tripObject = this.toObject();

    // Remove internal fields if needed
    delete tripObject.__v;

    return tripObject;
};

const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema);
export default Trip;
