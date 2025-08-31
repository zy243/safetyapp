// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Schema } = mongoose;

const userSchema = new Schema({
    // Basic Info
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/] },
    password: { type: String, minlength: 6, select: false },
    phone: { type: String, default: '', match: [/^\+?[1-9]\d{1,14}$/] },

    // Role & Identification
    role: { type: String, enum: ['student', 'teacher', 'security', 'staff', 'admin', 'guest'], default: 'student' },
    avatar: { type: String, default: null },
    googleId: { type: String },

    // Verification & Security
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    status: { type: String, enum: ['active', 'suspended', 'pending'], default: 'active' },
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },

    // Academic / Professional
    studentId: { type: String, trim: true },
    staffId: { type: String, trim: true },
    department: { type: String, trim: true },
    course: { type: String, trim: true },

    // Trusted Contacts
    trustedCircle: [{
        name: { type: String, required: true },
        phone: { type: String, required: true, match: [/^\+?[1-9]\d{1,14}$/] },
        email: { type: String, lowercase: true },
        relationship: { type: String, enum: ['family', 'friend', 'roommate', 'colleague', 'other'], default: 'friend' },
        priority: { type: Number, min: 1, max: 3, default: 1 },
        isActive: { type: Boolean, default: true },
        addedAt: { type: Date, default: Date.now }
    }],
    emergencyContacts: [{
        name: { type: String, required: true },
        phone: { type: String, required: true, match: [/^\+?[1-9]\d{1,14}$/] },
        type: { type: String, enum: ['campus_security', 'police', 'medical', 'personal', 'family'], default: 'personal' },
        isPrimary: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        notes: String
    }],

    // Privacy & Settings
    privacySettings: {
        anonymousMode: { type: Boolean, default: false },
        locationSharing: { type: Boolean, default: true },
        shareWithTrustedCircle: { type: Boolean, default: true },
        shareWithEmergencyContacts: { type: Boolean, default: true },
        showInDirectory: { type: Boolean, default: false },
        dataRetention: { type: String, enum: ['30days', '90days', '1year', 'indefinite'], default: '90days' }
    },
    preferences: {
        language: { type: String, default: 'en', enum: ['en', 'es', 'fr', 'de', 'zh'] },
        theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
        notifications: {
            pushEnabled: { type: Boolean, default: true },
            emailEnabled: { type: Boolean, default: true },
            smsEnabled: { type: Boolean, default: false },
            safetyAlerts: { type: Boolean, default: true },
            emergencyBroadcasts: { type: Boolean, default: true },
            followMeUpdates: { type: Boolean, default: true },
            escortRequests: { type: Boolean, default: true },
            incidentReports: { type: Boolean, default: false }
        },
        alertRadius: { type: Number, default: 1000, min: 100, max: 10000 }
    },

    // Follow-Me System
    followMe: {
        isActive: { type: Boolean, default: false },
        lastLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
            timestamp: { type: Date, default: Date.now },
            accuracy: Number,
            address: String,
            batteryLevel: Number
        },
        sharingWith: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
            canViewHistory: { type: Boolean, default: false }
        }],
        history: [{
            coordinates: { type: [Number], required: true },
            timestamp: { type: Date, default: Date.now },
            accuracy: Number,
            batteryLevel: Number,
            speed: Number
        }]
    },

    // Device Management
    devices: [{
        deviceId: { type: String, required: true },
        deviceName: String,
        platform: { type: String, enum: ['android', 'ios', 'web'], required: true },
        osVersion: String,
        appVersion: String,
        pushToken: String,
        lastActive: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true }
    }],

    // Statistics
    stats: {
        sosActivations: { type: Number, default: 0 },
        incidentReports: { type: Number, default: 0 },
        escortRequests: { type: Number, default: 0 },
        safetyAlertsReceived: { type: Number, default: 0 }
    },

    // Metadata
    lastActivity: Date,
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: Date,
    marketingConsent: { type: Boolean, default: false }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== Indexes (removed duplicates) =====
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ studentId: 1 }, { sparse: true });
userSchema.index({ staffId: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'followMe.lastLocation': '2dsphere' });
userSchema.index({ 'devices.lastActive': 1 });
userSchema.index({ createdAt: 1 });

// ===== Virtuals =====
userSchema.virtual('displayName').get(function () { return this.name || this.email.split('@')[0]; });
userSchema.virtual('isOnline').get(function () { return this.lastActivity && (Date.now() - this.lastActivity.getTime()) < 15 * 60 * 1000; });
userSchema.virtual('hasPassword').get(function () { return !!this.password; });

// ===== Middleware =====
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.pre('save', function (next) {
    if (this.isModified() && !this.isModified('lastActivity')) this.lastActivity = new Date();
    next();
});

// ===== Methods =====
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateVerificationToken = function () {
    const token = crypto.randomBytes(32).toString('hex');
    this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
    this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    return token;
};

userSchema.methods.generatePasswordResetToken = function () {
    const token = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    return token;
};

userSchema.methods.addTrustedContact = function (contactData) {
    this.trustedCircle.push({ ...contactData, addedAt: new Date() });
    return this.save();
};

userSchema.methods.addEmergencyContact = function (contactData) {
    this.emergencyContacts.push(contactData);
    return this.save();
};

userSchema.methods.updateLocation = function (locationData) {
    this.followMe.lastLocation = {
        type: 'Point',
        coordinates: [locationData.longitude, locationData.latitude],
        timestamp: new Date(),
        accuracy: locationData.accuracy,
        address: locationData.address,
        batteryLevel: locationData.batteryLevel
    };
    this.followMe.history.push({
        coordinates: [locationData.longitude, locationData.latitude],
        timestamp: new Date(),
        accuracy: locationData.accuracy,
        batteryLevel: locationData.batteryLevel,
        speed: locationData.speed
    });
    if (this.followMe.history.length > 100) this.followMe.history = this.followMe.history.slice(-100);
    return this.save();
};

userSchema.methods.registerDevice = function (deviceData) {
    const index = this.devices.findIndex(d => d.deviceId === deviceData.deviceId);
    if (index > -1) this.devices[index] = { ...this.devices[index].toObject(), ...deviceData, lastActive: new Date() };
    else this.devices.push({ ...deviceData, lastActive: new Date() });
    return this.save();
};

// ===== Static Methods =====
userSchema.statics.findByEmail = function (email) { return this.findOne({ email: email.toLowerCase() }); };
userSchema.statics.findNearby = function (long, lat, maxDistance = 5000) {
    return this.find({
        'followMe.isActive': true,
        'followMe.lastLocation': { $near: { $geometry: { type: 'Point', coordinates: [long, lat] }, $maxDistance: maxDistance } },
        status: 'active'
    }).select('name email role followMe.lastLocation');
};

// ===== Remove Sensitive Data =====
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.verificationToken;
    delete obj.verificationExpires;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpire;
    return obj;
};

// ===== Prevent OverwriteModelError =====
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
