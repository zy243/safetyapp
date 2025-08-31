import mongoose from 'mongoose';

// MongoDB connection setup
let isConnected = false;

export async function connectDB() {
    if (isConnected) {
        console.log('✅ MongoDB already connected');
        return;
    }

    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-safety';
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

// MongoDB Models
export const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: String,
    emergencyContacts: [{
        name: String,
        phone: String,
        email: String
    }],
    locationSharing: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}));

export const Report = mongoose.model('Report', new mongoose.Schema({
    type: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'Pending', enum: ['Pending', 'In Progress', 'Resolved'] },
    priority: { type: String, default: 'Medium', enum: ['Low', 'Medium', 'High', 'Critical'] },
    anonymous: { type: Boolean, default: false },
    images: [String],
    createdAt: { type: Date, default: Date.now }
}));

export const Escort = mongoose.model('Escort', new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: String, required: true },
    status: {
        type: String,
        default: 'Requested',
        enum: ['Requested', 'Accepted', 'In Progress', 'Completed', 'Cancelled']
    },
    securityGuard: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    estimatedTime: Number,
    actualTime: Number,
    startedAt: Date,
    completedAt: Date,
    createdAt: { type: Date, default: Date.now }
}));

export const Location = mongoose.model('Location', new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    address: String,
    timestamp: { type: Date, default: Date.now }
}));

export const Alert = mongoose.model('Alert', new mongoose.Schema({
    type: { type: String, required: true, enum: ['SOS', 'Safety', 'Incident'] },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    priority: { type: String, default: 'High', enum: ['Low', 'Medium', 'High', 'Critical'] },
    status: { type: String, default: 'Active', enum: ['Active', 'Resolved'] },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: Date
}));

export const Share = mongoose.model('Share', new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    duration: { type: Number, default: 30 }, // minutes
    expiresAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}));

// Helper functions for common operations
export const db = {
    // User operations
    async createUser(userData) {
        await connectDB();
        const user = new User(userData);
        return await user.save();
    },

    async findUserByEmail(email) {
        await connectDB();
        return await User.findOne({ email });
    },

    async findUserById(id) {
        await connectDB();
        return await User.findById(id);
    },

    // Report operations
    async createReport(reportData) {
        await connectDB();
        const report = new Report(reportData);
        return await report.save();
    },

    async getReports(filter = {}, page = 1, limit = 10) {
        await connectDB();
        const skip = (page - 1) * limit;
        const reports = await Report.find(filter)
            .populate('reportedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Report.countDocuments(filter);
        return { reports, total, page, totalPages: Math.ceil(total / limit) };
    },

    async updateReport(id, updateData) {
        await connectDB();
        return await Report.findByIdAndUpdate(id, updateData, { new: true });
    },

    // Escort operations
    async createEscortRequest(escortData) {
        await connectDB();
        const escort = new Escort(escortData);
        return await escort.save();
    },

    async getEscortRequests(filter = {}) {
        await connectDB();
        return await Escort.find(filter)
            .populate('requester', 'name email phone')
            .populate('securityGuard', 'name email phone')
            .sort({ createdAt: -1 });
    },

    async updateEscortStatus(id, status, guardId = null) {
        await connectDB();
        const updateData = { status };
        if (guardId) updateData.securityGuard = guardId;
        if (status === 'In Progress') updateData.startedAt = new Date();
        if (status === 'Completed') updateData.completedAt = new Date();

        return await Escort.findByIdAndUpdate(id, updateData, { new: true });
    },

    // Location operations
    async updateUserLocation(userId, locationData) {
        await connectDB();
        const location = new Location({
            user: userId,
            coordinates: {
                latitude: locationData.latitude,
                longitude: locationData.longitude
            },
            address: locationData.address
        });
        return await location.save();
    },

    async getUserLocations(userId, limit = 10) {
        await connectDB();
        return await Location.find({ user: userId })
            .sort({ timestamp: -1 })
            .limit(limit);
    },

    // Alert operations
    async createAlert(alertData) {
        await connectDB();
        const alert = new Alert(alertData);
        return await alert.save();
    },

    async getActiveAlerts() {
        await connectDB();
        return await Alert.find({ status: 'Active' })
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });
    },

    async resolveAlert(alertId, responderId) {
        await connectDB();
        return await Alert.findByIdAndUpdate(
            alertId,
            {
                status: 'Resolved',
                respondedBy: responderId,
                resolvedAt: new Date()
            },
            { new: true }
        );
    },

    // Share operations
    async createLocationShare(shareData) {
        await connectDB();
        const share = new Share(shareData);
        return await share.save();
    },

    async getActiveShares(userId) {
        await connectDB();
        return await Share.find({
            user: userId,
            active: true,
            expiresAt: { $gt: new Date() }
        }).populate('recipient', 'name email');
    },

    async deactivateShare(shareId) {
        await connectDB();
        return await Share.findByIdAndUpdate(
            shareId,
            { active: false },
            { new: true }
        );
    }
};

// Initialize database connection when imported
connectDB().catch(console.error);

export default db;