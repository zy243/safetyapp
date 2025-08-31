import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    // Incident Type (required)
    type: {
        type: String,
        required: [true, 'Incident type is required'],
        enum: {
            values: [
                'Theft',
                'Harassment',
                'Accident',
                'Suspicious Activity',
                'Fire',
                'Medical Emergency',
                'Other'
            ],
            message: 'Invalid incident type'
        }
    },

    // Description (required)
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters long'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },

    // Location (required)
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true,
        maxlength: [500, 'Location cannot exceed 500 characters']
    },

    // Reported by user
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Status tracking
    status: {
        type: String,
        enum: ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Closed'],
        default: 'Pending'
    },

    // Priority level
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },

    // Additional details for specific incident types
    details: {
        // For theft incidents
        stolenItems: [{
            name: String,
            description: String,
            value: Number,
            serialNumber: String
        }],

        // For harassment incidents
        harassmentType: {
            type: String,
            enum: ['Verbal', 'Physical', 'Sexual', 'Cyber', 'Other']
        },
        perpetratorDescription: String,

        // For accident incidents
        accidentType: {
            type: String,
            enum: ['Vehicle', 'Slip/Trip', 'Equipment', 'Other']
        },
        injuries: [{
            type: { type: String },
            severity: {
                type: String,
                enum: ['Minor', 'Moderate', 'Severe', 'Critical']
            }
        }],

        // For suspicious activity
        suspiciousBehavior: String,
        numberOfPeople: Number,
        timeObserved: Date,

        // For fire incidents
        fireSize: {
            type: String,
            enum: ['Small', 'Medium', 'Large', 'Extreme']
        },
        evacuationRequired: Boolean,

        // For medical emergencies
        medicalCondition: String,
        emergencyServicesCalled: Boolean,
        firstAidProvided: Boolean,

        // For other incidents
        customType: String
    },

    // Evidence (images, videos, documents)
    evidence: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        },
        description: String
    }],

    // Location coordinates (if available)
    coordinates: {
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        },
        accuracy: Number // in meters
    },

    // Anonymous reporting option
    anonymous: {
        type: Boolean,
        default: false
    },

    // Contact information for follow-up (if not anonymous)
    contactPreference: {
        type: String,
        enum: ['Email', 'Phone', 'None'],
        default: 'Email'
    },
    preferredContactTime: {
        from: String, // e.g., "09:00"
        to: String    // e.g., "17:00"
    },

    // Emergency services involvement
    emergencyServices: {
        called: Boolean,
        servicesInvolved: [{
            type: String,
            enum: ['Police', 'Fire', 'Ambulance', 'Campus Security']
        }],
        referenceNumber: String
    },

    // Follow-up information
    followUp: {
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Security staff or admin
        },
        notes: [{
            note: String,
            addedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }],
        resolution: String,
        resolutionDate: Date
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    closedAt: Date
}, {
    // Enable virtuals and toJSON transformation
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ location: 'text', description: 'text' });
reportSchema.index({ reportedBy: 1, createdAt: -1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Virtual for formatted date
reportSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Virtual for whether report is open
reportSchema.virtual('isOpen').get(function () {
    return ['Pending', 'Under Review', 'In Progress'].includes(this.status);
});

// Pre-save middleware to update updatedAt
reportSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to get reports by status
reportSchema.statics.findByStatus = function (status) {
    return this.find({ status }).populate('reportedBy', 'name email');
};

// Static method to get reports within date range
reportSchema.statics.findByDateRange = function (startDate, endDate) {
    return this.find({
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).sort({ createdAt: -1 });
};

// Instance method to add follow-up note
reportSchema.methods.addNote = function (note, userId) {
    this.followUp.notes.push({
        note,
        addedBy: userId
    });
    return this.save();
};

// Instance method to update status
reportSchema.methods.updateStatus = function (newStatus, note = null, userId = null) {
    this.status = newStatus;

    if (note && userId) {
        this.addNote(`Status changed to ${newStatus}: ${note}`, userId);
    }

    if (newStatus === 'Resolved' || newStatus === 'Closed') {
        this.closedAt = new Date();
    }

    return this.save();
};

// Export the model
const Report = mongoose.model('Report', reportSchema);
export default Report;