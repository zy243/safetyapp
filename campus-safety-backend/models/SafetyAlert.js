import mongoose from 'mongoose';

const safetyAlertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    category: {
        type: String,
        enum: ['theft', 'assault', 'fire', 'medical', 'weather', 'traffic', 'other'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    location: {
        latitude: {
            type: Number,
            required: true,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            required: true,
            min: -180,
            max: 180
        },
        address: {
            type: String,
            trim: true
        },
        building: {
            type: String,
            trim: true
        },
        area: {
            type: String,
            trim: true,
            enum: [
                'engineering', 'science', 'arts', 'library', 'dormitory',
                'sports', 'cafeteria', 'parking', 'main-campus', 'north-campus',
                'south-campus', 'east-campus', 'west-campus'
            ]
        },
        floor: {
            type: String,
            trim: true
        },
        room: {
            type: String,
            trim: true
        }
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'false_alarm', 'under_investigation'],
        default: 'active'
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    isEmergency: {
        type: Boolean,
        default: false
    },
    affectedArea: {
        radius: {
            type: Number,
            default: 500, // meters
            min: 50,
            max: 5000
        },
        buildings: [{
            type: String,
            trim: true
        }],
        areas: [{
            type: String,
            enum: [
                'engineering', 'science', 'arts', 'library', 'dormitory',
                'sports', 'cafeteria', 'parking', 'main-campus', 'north-campus',
                'south-campus', 'east-campus', 'west-campus'
            ]
        }],
        floors: [{
            type: String,
            trim: true
        }]
    },
    notifications: {
        pushSent: {
            type: Boolean,
            default: false
        },
        pushSentAt: Date,
        emailSent: {
            type: Boolean,
            default: false
        },
        emailSentAt: Date,
        smsSent: {
            type: Boolean,
            default: false
        },
        smsSentAt: Date,
        recipients: {
            push: {
                type: Number,
                default: 0
            },
            email: {
                type: Number,
                default: 0
            },
            sms: {
                type: Number,
                default: 0
            }
        }
    },
    evidence: [{
        type: {
            type: String,
            enum: ['photo', 'video', 'audio', 'document']
        },
        url: String,
        filename: String,
        description: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    witnesses: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        contactInfo: String,
        statement: String,
        isAnonymous: {
            type: Boolean,
            default: false
        }
    }],
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: Date,
    resolutionNotes: String,
    followUpActions: [{
        action: String,
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        dueDate: Date,
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            default: 'pending'
        },
        notes: String,
        completedAt: Date
    }],
    priority: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },
    estimatedResolutionTime: {
        type: Number // in minutes
    },
    tags: [{
        type: String,
        trim: true
    }],
    relatedIncidents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident'
    }],
    isTest: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for optimized queries
safetyAlertSchema.index({ location: '2dsphere' });
safetyAlertSchema.index({ status: 1, createdAt: -1 });
safetyAlertSchema.index({ category: 1, severity: 1 });
safetyAlertSchema.index({ 'location.area': 1, status: 1 });
safetyAlertSchema.index({ isEmergency: 1, status: 1 });
safetyAlertSchema.index({ reportedBy: 1, createdAt: -1 });
safetyAlertSchema.index({ severity: 1, createdAt: -1 });
safetyAlertSchema.index({ tags: 1 });
safetyAlertSchema.index({ createdAt: -1 });

// Virtual for formatted address
safetyAlertSchema.virtual('formattedAddress').get(function () {
    const parts = [];
    if (this.location.building) parts.push(this.location.building);
    if (this.location.room) parts.push(`Room ${this.location.room}`);
    if (this.location.floor) parts.push(`Floor ${this.location.floor}`);
    if (this.location.area) parts.push(this.location.area);
    if (this.location.address) parts.push(this.location.address);
    return parts.join(', ') || 'Location not specified';
});

// Virtual for time since creation
safetyAlertSchema.virtual('timeAgo').get(function () {
    const now = new Date();
    const diff = now - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
});

// Virtual for isActive
safetyAlertSchema.virtual('isActive').get(function () {
    return this.status === 'active' || this.status === 'under_investigation';
});

// Static method to find alerts by location proximity
safetyAlertSchema.statics.findNearby = function (latitude, longitude, maxDistance = 1000, filters = {}) {
    return this.find({
        ...filters,
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistance
            }
        }
    }).populate('reportedBy', 'name');
};

// Static method to find active alerts for area
safetyAlertSchema.statics.findActiveForArea = function (area, severity = null) {
    const filter = {
        status: { $in: ['active', 'under_investigation'] },
        $or: [
            { 'location.area': area },
            { 'affectedArea.areas': area },
            { 'affectedArea.buildings': { $in: [new RegExp(area, 'i')] } }
        ]
    };

    if (severity) {
        filter.severity = severity;
    }

    return this.find(filter)
        .populate('reportedBy', 'name')
        .sort({ severity: -1, createdAt: -1 });
};

// Static method to get alert statistics
safetyAlertSchema.statics.getStatistics = async function (timeRange = '24h') {
    const timeFilters = {
        '24h': { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        '7d': { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        '30d': { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    };

    const filter = timeFilters[timeRange] || {};

    const stats = await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['active', 'under_investigation']] },
                            1,
                            0
                        ]
                    }
                },
                byCategory: { $push: '$category' },
                bySeverity: { $push: '$severity' },
                byStatus: { $push: '$status' }
            }
        }
    ]);

    // Process category counts
    const categoryCount = stats[0]?.byCategory?.reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {}) || {};

    // Process severity counts
    const severityCount = stats[0]?.bySeverity?.reduce((acc, severity) => {
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
    }, {}) || {};

    // Process status counts
    const statusCount = stats[0]?.byStatus?.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {}) || {};

    return {
        total: stats[0]?.total || 0,
        active: stats[0]?.active || 0,
        byCategory: categoryCount,
        bySeverity: severityCount,
        byStatus: statusCount
    };
};

// Instance method to resolve alert
safetyAlertSchema.methods.resolveAlert = function (userId, notes = '', actions = []) {
    this.status = 'resolved';
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    this.resolutionNotes = notes;

    if (actions && actions.length > 0) {
        this.followUpActions.push(...actions);
    }

    return this.save();
};

// Instance method to add evidence
safetyAlertSchema.methods.addEvidence = function (evidenceData) {
    this.evidence.push({
        ...evidenceData,
        uploadedAt: new Date()
    });
    return this.save();
};

// Instance method to add witness
safetyAlertSchema.methods.addWitness = function (witnessData) {
    this.witnesses.push(witnessData);
    return this.save();
};

// Instance method to update notification status
safetyAlertSchema.methods.updateNotificationStatus = function (type, count = 0) {
    const notificationType = type.toLowerCase();

    if (['push', 'email', 'sms'].includes(notificationType)) {
        this.notifications[`${notificationType}Sent`] = true;
        this.notifications[`${notificationType}SentAt`] = new Date();
        this.notifications.recipients[notificationType] = count;
    }

    return this.save();
};

// Pre-save middleware to set emergency flag based on severity
safetyAlertSchema.pre('save', function (next) {
    if (this.severity === 'critical' || this.severity === 'high') {
        this.isEmergency = true;
    } else {
        this.isEmergency = false;
    }

    // Set priority based on severity
    const priorityMap = {
        critical: 10,
        high: 8,
        medium: 5,
        low: 3
    };
    this.priority = priorityMap[this.severity] || 5;

    next();
});

// Pre-remove middleware to clean up related data
safetyAlertSchema.pre('remove', async function (next) {
    // Remove any related file uploads or external references
    // This would be implemented based on your file storage system
    next();
});

const SafetyAlert = mongoose.models.SafetyAlert || mongoose.model('SafetyAlert', safetyAlertSchema);
export default SafetyAlert;
