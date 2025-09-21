import mongoose from 'mongoose';

const guardianSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  estimatedArrival: {
    type: Date,
    required: true
  },
  actualArrival: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  route: [{
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  currentLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  trustedContacts: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true
    },
    isNotified: {
      type: Boolean,
      default: false
    },
    notificationSentAt: {
      type: Date,
      default: null
    }
  }],
  checkInInterval: {
    type: Number,
    default: 5 // minutes
  },
  lastCheckIn: {
    type: Date,
    default: null
  },
  nextCheckIn: {
    type: Date,
    default: null
  },
  safetyChecks: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    response: {
      type: String,
      enum: ['yes', 'no', 'pending', 'missed'],
      default: 'pending'
    },
    location: {
      latitude: Number,
      longitude: Number
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'emergency'],
    default: 'active'
  },
  emergencyEscalated: {
    type: Boolean,
    default: false
  },
  emergencyEscalatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
guardianSessionSchema.index({ studentId: 1, isActive: 1 });
guardianSessionSchema.index({ sessionId: 1 });
guardianSessionSchema.index({ createdAt: -1 });

export default mongoose.model('GuardianSession', guardianSessionSchema);
