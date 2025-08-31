import Notification from '../models/Notification.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

// Get user notifications
export const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        const filter = { recipient: req.user.id };
        if (unreadOnly === 'true') {
            filter.read = false;
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({
            recipient: req.user.id,
            read: false
        });

        res.status(200).json({
            success: true,
            notifications: notifications.map(notification => ({
                id: notification._id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                priority: notification.priority,
                category: notification.category,
                data: notification.data,
                read: notification.read,
                readAt: notification.readAt,
                createdAt: notification.createdAt
            })),
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasNext: parseInt(page) * parseInt(limit) < total
            },
            unreadCount
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { read: true, readAt: new Date() }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete notification
export const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Send notification to user
export const sendNotification = async (req, res) => {
    try {
        const {
            recipientId,
            title,
            message,
            type,
            priority = 'normal',
            category,
            data,
            channels = ['push']
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!['security', 'staff'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        const notification = await Notification.create({
            recipient: recipientId,
            title,
            message,
            type,
            priority,
            category,
            data
        });

        // Send through different channels based on user preferences
        const sendResults = {};

        // Push notification
        if (channels.includes('push') && recipient.preferences?.notifications?.pushEnabled) {
            try {
                await sendPushNotification(recipient, notification);
                sendResults.push = 'sent';
            } catch (err) {
                sendResults.push = 'failed';
                console.error('Push notification failed:', err);
            }
        }

        // Email notification
        if (channels.includes('email') && recipient.preferences?.notifications?.emailEnabled) {
            try {
                await sendEmailNotification(recipient, notification);
                sendResults.email = 'sent';
            } catch (err) {
                sendResults.email = 'failed';
                console.error('Email notification failed:', err);
            }
        }

        // SMS notification
        if (channels.includes('sms') && recipient.preferences?.notifications?.smsEnabled && recipient.phone) {
            try {
                await sendSMSNotification(recipient, notification);
                sendResults.sms = 'sent';
            } catch (err) {
                sendResults.sms = 'failed';
                console.error('SMS notification failed:', err);
            }
        }

        // Update notification status
        notification.status = 'sent';
        await notification.save();

        res.status(201).json({
            success: true,
            notification: {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                priority: notification.priority
            },
            sendResults
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Send bulk notifications
export const sendBulkNotifications = async (req, res) => {
    try {
        const {
            recipientIds,
            title,
            message,
            type,
            priority = 'normal',
            category,
            data,
            channels = ['push']
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!['security', 'staff'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Recipient IDs array is required'
            });
        }

        const notifications = [];
        const sendResults = {};

        for (const recipientId of recipientIds) {
            const recipient = await User.findById(recipientId);
            if (!recipient) continue;

            const notification = await Notification.create({
                recipient: recipientId,
                title,
                message,
                type,
                priority,
                category,
                data
            });

            notifications.push(notification);

            // Send through different channels
            if (channels.includes('push') && recipient.preferences?.notifications?.pushEnabled) {
                try {
                    await sendPushNotification(recipient, notification);
                    sendResults.push = (sendResults.push || 0) + 1;
                } catch (err) {
                    console.error('Push notification failed for user:', recipientId, err);
                }
            }

            if (channels.includes('email') && recipient.preferences?.notifications?.emailEnabled) {
                try {
                    await sendEmailNotification(recipient, notification);
                    sendResults.email = (sendResults.email || 0) + 1;
                } catch (err) {
                    console.error('Email notification failed for user:', recipientId, err);
                }
            }

            if (channels.includes('sms') && recipient.preferences?.notifications?.smsEnabled && recipient.phone) {
                try {
                    await sendSMSNotification(recipient, notification);
                    sendResults.sms = (sendResults.sms || 0) + 1;
                } catch (err) {
                    console.error('SMS notification failed for user:', recipientId, err);
                }
            }
        }

        // Update all notifications status
        await Notification.updateMany(
            { _id: { $in: notifications.map(n => n._id) } },
            { status: 'sent' }
        );

        res.status(201).json({
            success: true,
            sentCount: notifications.length,
            sendResults
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!['security', 'staff'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const stats = await Notification.aggregate([
            {
                $group: {
                    _id: {
                        type: '$type',
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const typeStats = await Notification.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    read: {
                        $sum: {
                            $cond: [{ $eq: ['$read', true] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const totalNotifications = await Notification.countDocuments();
        const totalUnread = await Notification.countDocuments({ read: false });

        res.status(200).json({
            success: true,
            stats,
            typeStats,
            summary: {
                total: totalNotifications,
                unread: totalUnread,
                read: totalNotifications - totalUnread
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Helper function to send push notification
async function sendPushNotification(user, notification) {
    // This would integrate with a push notification service like Firebase
    // For now, we'll just log it
    console.log(`Push notification to ${user.name}: ${notification.title}`);

    // Update notification channels status
    notification.channels.push.sent = true;
    notification.channels.push.sentAt = new Date();
    await notification.save();
}

// Helper function to send email notification
async function sendEmailNotification(user, notification) {
    const emailMessage = `
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        <p><strong>Type:</strong> ${notification.type}</p>
        <p><strong>Priority:</strong> ${notification.priority}</p>
        <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
    `;

    await sendEmail({
        email: user.email,
        subject: notification.title,
        message: emailMessage
    });

    // Update notification channels status
    notification.channels.email.sent = true;
    notification.channels.email.sentAt = new Date();
    await notification.save();
}

// Helper function to send SMS notification
async function sendSMSNotification(user, notification) {
    // This would integrate with an SMS service like Twilio
    // For now, we'll just log it
    console.log(`SMS to ${user.phone}: ${notification.title} - ${notification.message}`);

    // Update notification channels status
    notification.channels.sms.sent = true;
    notification.channels.sms.sentAt = new Date();
    await notification.save();
}




