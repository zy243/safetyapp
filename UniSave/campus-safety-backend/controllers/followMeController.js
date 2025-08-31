import FollowMe from '../models/FollowMe.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// Start Follow Me session
export const startFollowMe = async (req, res) => {
    try {
        const {
            latitude,
            longitude,
            accuracy,
            address,
            duration = 3600, // Default 1 hour
            shareWith
        } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location coordinates are required'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user already has an active Follow Me session
        let followMe = await FollowMe.findOne({
            user: req.user.id,
            isActive: true
        });

        if (followMe) {
            return res.status(400).json({
                success: false,
                message: 'Follow Me session already active'
            });
        }

        const expiresAt = new Date(Date.now() + duration * 1000);

        // Prepare sharing list
        const sharingList = [];
        if (shareWith && Array.isArray(shareWith)) {
            for (const contactId of shareWith) {
                const contact = await User.findById(contactId);
                if (contact && user.trustedCircle.some(c => c.phone === contact.phone)) {
                    sharingList.push({
                        userId: contactId,
                        expiresAt
                    });
                }
            }
        }

        followMe = await FollowMe.create({
            user: req.user.id,
            isActive: true,
            expiresAt,
            sharingWith: sharingList,
            currentLocation: {
                latitude,
                longitude,
                accuracy,
                address,
                timestamp: new Date()
            },
            locationHistory: [{
                latitude,
                longitude,
                accuracy,
                address,
                timestamp: new Date()
            }]
        });

        // Update user's followMe status
        user.followMe.isActive = true;
        user.followMe.lastLocation = {
            latitude,
            longitude,
            timestamp: new Date()
        };
        await user.save();

        // Notify trusted contacts
        if (sharingList.length > 0) {
            await notifyTrustedContacts(user, followMe, 'started');
        }

        res.status(201).json({
            success: true,
            followMe: {
                id: followMe._id,
                isActive: followMe.isActive,
                expiresAt: followMe.expiresAt,
                currentLocation: followMe.currentLocation,
                sharingWith: sharingList.length
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update location during Follow Me session
export const updateLocation = async (req, res) => {
    try {
        const { latitude, longitude, accuracy, address } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location coordinates are required'
            });
        }

        const followMe = await FollowMe.findOne({
            user: req.user.id,
            isActive: true
        });

        if (!followMe) {
            return res.status(404).json({
                success: false,
                message: 'No active Follow Me session'
            });
        }

        // Check if session has expired
        if (new Date() > followMe.expiresAt) {
            followMe.isActive = false;
            followMe.status = 'stopped';
            await followMe.save();

            // Update user status
            const user = await User.findById(req.user.id);
            user.followMe.isActive = false;
            await user.save();

            return res.status(400).json({
                success: false,
                message: 'Follow Me session has expired'
            });
        }

        const locationUpdate = {
            latitude,
            longitude,
            accuracy,
            address,
            timestamp: new Date()
        };

        // Update current location
        followMe.currentLocation = locationUpdate;

        // Add to history (keep only last 100 points)
        followMe.locationHistory.push(locationUpdate);
        if (followMe.locationHistory.length > followMe.settings.maxHistoryPoints) {
            followMe.locationHistory = followMe.locationHistory.slice(-followMe.settings.maxHistoryPoints);
        }

        await followMe.save();

        // Update user's last location
        const user = await User.findById(req.user.id);
        user.followMe.lastLocation = locationUpdate;
        await user.save();

        // Emit real-time update to connected clients
        const io = req.app.get('io');
        followMe.sharingWith.forEach(share => {
            io.to(`user_${share.userId}`).emit('followMeUpdate', {
                userId: req.user.id,
                userName: user.name,
                location: locationUpdate
            });
        });

        res.status(200).json({
            success: true,
            location: locationUpdate
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Stop Follow Me session
export const stopFollowMe = async (req, res) => {
    try {
        const followMe = await FollowMe.findOne({
            user: req.user.id,
            isActive: true
        });

        if (!followMe) {
            return res.status(404).json({
                success: false,
                message: 'No active Follow Me session'
            });
        }

        followMe.isActive = false;
        followMe.status = 'stopped';
        await followMe.save();

        // Update user status
        const user = await User.findById(req.user.id);
        user.followMe.isActive = false;
        await user.save();

        // Notify trusted contacts
        await notifyTrustedContacts(user, followMe, 'stopped');

        res.status(200).json({
            success: true,
            message: 'Follow Me session stopped'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get Follow Me status
export const getFollowMeStatus = async (req, res) => {
    try {
        const followMe = await FollowMe.findOne({
            user: req.user.id,
            isActive: true
        });

        if (!followMe) {
            return res.status(200).json({
                success: true,
                isActive: false
            });
        }

        res.status(200).json({
            success: true,
            isActive: true,
            followMe: {
                id: followMe._id,
                startedAt: followMe.startedAt,
                expiresAt: followMe.expiresAt,
                currentLocation: followMe.currentLocation,
                sharingWith: followMe.sharingWith.length,
                status: followMe.status
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get someone's location (if shared with you)
export const getSharedLocation = async (req, res) => {
    try {
        const { userId } = req.params;

        const followMe = await FollowMe.findOne({
            user: userId,
            isActive: true,
            'sharingWith.userId': req.user.id
        });

        if (!followMe) {
            return res.status(404).json({
                success: false,
                message: 'Location not shared with you'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name
            },
            location: followMe.currentLocation,
            startedAt: followMe.startedAt,
            expiresAt: followMe.expiresAt
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get Follow Me history
export const getFollowMeHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const followMeSessions = await FollowMe.find({ user: req.user.id })
            .sort({ startedAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await FollowMe.countDocuments({ user: req.user.id });

        res.status(200).json({
            success: true,
            sessions: followMeSessions.map(session => ({
                id: session._id,
                startedAt: session.startedAt,
                expiresAt: session.expiresAt,
                status: session.status,
                duration: Math.round((session.expiresAt - session.startedAt) / 1000 / 60), // minutes
                locationCount: session.locationHistory.length
            })),
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasNext: parseInt(page) * parseInt(limit) < total
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update Follow Me settings
export const updateSettings = async (req, res) => {
    try {
        const { updateInterval, maxHistoryPoints, shareLocation, shareAddress } = req.body;

        const followMe = await FollowMe.findOne({
            user: req.user.id,
            isActive: true
        });

        if (!followMe) {
            return res.status(404).json({
                success: false,
                message: 'No active Follow Me session'
            });
        }

        if (updateInterval !== undefined) followMe.settings.updateInterval = updateInterval;
        if (maxHistoryPoints !== undefined) followMe.settings.maxHistoryPoints = maxHistoryPoints;
        if (shareLocation !== undefined) followMe.settings.shareLocation = shareLocation;
        if (shareAddress !== undefined) followMe.settings.shareAddress = shareAddress;

        await followMe.save();

        res.status(200).json({
            success: true,
            settings: followMe.settings
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Helper function to notify trusted contacts
async function notifyTrustedContacts(user, followMe, action) {
    try {
        const notifications = followMe.sharingWith.map(share => ({
            recipient: share.userId,
            title: `Follow Me ${action}`,
            message: `${user.name} has ${action} sharing their location with you`,
            type: 'follow_me',
            priority: 'normal',
            data: {
                userId: user._id,
                userName: user.name,
                action
            }
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('Error notifying trusted contacts:', err);
    }
}




