import SOSAlert from '../models/SOSAlert.js';
import User from '../models/User.js';
import notificationService from '../services/notificationService.js';

export const sendAlert = async (req, res) => {
    try {
        const { message, summary, severity, coordinates, address, triggeredBy, userId } = req.body;

        const alertUserId = req.user?.id || userId;
        if (!alertUserId) {
            return res.status(400).json({ success: false, message: 'User ID is required for SOS alerts' });
        }

        const sosAlert = new SOSAlert({
            user: alertUserId,
            message: message || 'Emergency SOS activated',
            summary,
            severity: severity || 'high',
            location: { type: 'Point', coordinates: coordinates || [0, 0] },
            address: address || 'Location not available',
            triggeredBy: triggeredBy || 'manual'
        });

        await sosAlert.save();
        await sosAlert.populate('user', 'name phone email emergencyContacts');

        // Background notifications
        setTimeout(async () => {
            try { await performSOSActions(sosAlert); }
            catch (err) { console.error('SOS background actions error:', err); }
        }, 1000);

        const io = req.app.get('io');
        io.to('security').emit('sos-alert', {
            alertId: sosAlert._id,
            user: sosAlert.user,
            location: sosAlert.location,
            address: sosAlert.address,
            severity: sosAlert.severity,
            triggeredAt: sosAlert.createdAt
        });

        res.status(201).json({ success: true, message: 'SOS alert activated', alertId: sosAlert._id });
    } catch (error) {
        console.error('SOS alert error:', error);
        res.status(500).json({ success: false, message: 'Error activating SOS alert', error: error.message });
    }
};

// Get all alerts
export const getAllAlerts = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let filter = {};
        if (status) filter.status = status;

        const alerts = await SOSAlert.find(filter)
            .populate('user', 'name phone email')
            .populate('handledBy', 'name')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const total = await SOSAlert.countDocuments(filter);

        res.json({
            success: true,
            alerts,
            pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ success: false, message: 'Error fetching alerts', error: error.message });
    }
};

// Resolve alert
export const resolveAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const alert = await SOSAlert.findById(id);
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        if (alert.status === 'resolved') return res.status(400).json({ success: false, message: 'Alert already resolved' });

        await alert.resolve(req.user.id, notes);

        const io = req.app.get('io');
        io.to('security').emit('sos-resolved', { alertId: alert._id, resolvedBy: req.user.name, resolvedAt: alert.resolvedAt });

        res.json({ success: true, message: 'Alert resolved', alert });
    } catch (error) {
        console.error('Resolve alert error:', error);
        res.status(500).json({ success: false, message: 'Error resolving alert', error: error.message });
    }
};

// Get alert by ID
export const getAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await SOSAlert.findById(id)
            .populate('user', 'name phone email emergencyContacts')
            .populate('handledBy', 'name')
            .populate('contacts.contactId', 'name phone email');

        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

        res.json({ success: true, alert });
    } catch (error) {
        console.error('Get alert error:', error);
        res.status(500).json({ success: false, message: 'Error fetching alert', error: error.message });
    }
};

// --------------------- Helper functions ---------------------

async function performSOSActions(sosAlert) {
    try {
        sosAlert.actions.photoCaptured = true;
        sosAlert.actions.videoRecording = true;
        sosAlert.actions.locationObtained = true;

        sosAlert.media.photos.push({ url: `/uploads/sos/${sosAlert._id}/photo-${Date.now()}.jpg`, timestamp: new Date() });
        sosAlert.media.videos.push({ url: `/uploads/sos/${sosAlert._id}/video-${Date.now()}.mp4`, duration: 120, timestamp: new Date() });

        await sosAlert.save();

        await notifyEmergencyContacts(sosAlert);

        sosAlert.actions.contactsNotified = true;
        await sosAlert.save();
    } catch (error) {
        console.error('SOS actions error:', error);
    }
}

async function notifyEmergencyContacts(sosAlert) {
    try {
        const user = await User.findById(sosAlert.user).populate('emergencyContacts');
        if (!user?.emergencyContacts?.length) return;

        const message = `🚨 EMERGENCY ALERT: ${user.name} activated SOS at ${sosAlert.address}.
Time: ${sosAlert.createdAt.toLocaleString()}
Coordinates: ${sosAlert.location.coordinates[1]}, ${sosAlert.location.coordinates[0]}
Severity: ${sosAlert.severity.toUpperCase()}`;

        for (const contact of user.emergencyContacts) {
            try {
                if (contact.phone) await notificationService.sendUserNotification(contact._id, { type: 'emergency', title: 'SOS Alert', message });
            } catch (error) {
                console.error(`Failed to notify contact ${contact.name}:`, error);
            }
            sosAlert.contacts.push({ contactId: contact._id, notifiedAt: new Date(), status: 'notified' });
        }

        await sosAlert.save();
    } catch (error) {
        console.error('Emergency contact notification error:', error);
    }
}
