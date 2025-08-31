import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        minlength: 6,
        select: false
    },
    phone: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'security', 'staff', 'guest'],
        default: 'student'
    },
    avatar: {
        type: String
    },
    googleId: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
    },
    // New fields for comprehensive features
    studentId: {
        type: String,
        trim: true
    },
    staffId: {
        type: String,
        trim: true
    },
    // Trusted Circle - Family and friends
    trustedCircle: [{
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        email: String,
        relationship: {
            type: String,
            enum: ['family', 'friend', 'roommate', 'other'],
            default: 'friend'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    // Emergency Contacts
    emergencyContacts: [{
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['campus_security', 'police', 'medical', 'personal'],
            default: 'personal'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    // Privacy Controls
    privacySettings: {
        anonymousMode: {
            type: Boolean,
            default: false
        },
        locationSharing: {
            type: Boolean,
            default: true
        },
        shareWithTrustedCircle: {
            type: Boolean,
            default: true
        },
        shareWithEmergencyContacts: {
            type: Boolean,
            default: true
        }
    },
    // App Preferences
    preferences: {
        language: {
            type: String,
            default: 'en'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        },
        notifications: {
            pushEnabled: {
                type: Boolean,
                default: true
            },
            emailEnabled: {
                type: Boolean,
                default: true
            },
            smsEnabled: {
                type: Boolean,
                default: true
            },
            safetyAlerts: {
                type: Boolean,
                default: true
            },
            emergencyBroadcasts: {
                type: Boolean,
                default: true
            },
            followMeUpdates: {
                type: Boolean,
                default: true
            }
        }
    },
    // Follow Me Feature
    followMe: {
        isActive: {
            type: Boolean,
            default: false
        },
        lastLocation: {
            latitude: Number,
            longitude: Number,
            timestamp: Date
        },
        sharingWith: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            expiresAt: Date
        }]
    },
    // Device Information
    devices: [{
        deviceId: String,
        deviceType: String,
        pushToken: String,
        lastActive: Date
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);