// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true }, // keep unique here, remove schema.index
    password: { type: String, minlength: 6, select: false },
    phone: { type: String, default: '' },
    role: {
        type: String,
        enum: ['student', 'teacher', 'security', 'staff', 'guest'],
        default: 'student'
    },
    avatar: { type: String },
    googleId: { type: String },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },

    studentId: { type: String, trim: true },
    staffId: { type: String, trim: true },

    trustedCircle: [{
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: String,
        relationship: { type: String, enum: ['family', 'friend', 'roommate', 'other'], default: 'friend' },
        isActive: { type: Boolean, default: true }
    }],

    emergencyContacts: [{
        name: { type: String, required: true },
        phone: { type: String, required: true },
        type: { type: String, enum: ['campus_security', 'police', 'medical', 'personal'], default: 'personal' },
        isActive: { type: Boolean, default: true }
    }],

    privacySettings: {
        anonymousMode: { type: Boolean, default: false },
        locationSharing: { type: Boolean, default: true },
        shareWithTrustedCircle: { type: Boolean, default: true },
        shareWithEmergencyContacts: { type: Boolean, default: true }
    },

    preferences: {
        language: { type: String, default: 'en' },
        theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
        notifications: {
            pushEnabled: { type: Boolean, default: true },
            emailEnabled: { type: Boolean, default: true },
            smsEnabled: { type: Boolean, default: true },
            safetyAlerts: { type: Boolean, default: true },
            emergencyBroadcasts: { type: Boolean, default: true },
            followMeUpdates: { type: Boolean, default: true }
        }
    },

    followMe: {
        isActive: { type: Boolean, default: false },
        lastLocation: {
            type: { type: String, default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
            timestamp: Date
        },
        sharingWith: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            expiresAt: Date
        }]
    },

    devices: [{
        deviceId: { type: String, required: true },
        platform: { type: String, enum: ['android', 'ios', 'web'], default: 'web' },
        pushToken: String,
        lastActive: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Indexes (remove email index here, keep others)
userSchema.index({ studentId: 1 });
userSchema.index({ staffId: 1 });
userSchema.index({ 'followMe.lastLocation': '2dsphere' });

// Pre-save: hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from returned JSON
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        return ret;
    }
});

export default mongoose.model('User', userSchema);
