import mongoose from 'mongoose';

const sosAlertSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alertId: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'false_alarm'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  description: {
    type: String,
    trim: true
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio']
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    }
  }],
  assignedStaff: [{
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['assigned', 'acknowledged', 'en_route', 'on_site', 'resolved'],
      default: 'assigned'
    }
  }],
  response: {
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolution: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  notifications: [{
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    channel: {
      type: String,
      enum: ['push', 'email', 'sms']
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }],
  isEscalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: {
    type: Date,
    default: null
  },
  escalatedTo: [{
    type: String,
    enum: ['security', 'police', 'emergency_services', 'university_admin']
  }]
}, {
  timestamps: true
});

// Index for efficient queries
sosAlertSchema.index({ studentId: 1, status: 1 });
sosAlertSchema.index({ timestamp: -1 });
sosAlertSchema.index({ status: 1, priority: 1 });

export default mongoose.model('SOSAlert', sosAlertSchema);
