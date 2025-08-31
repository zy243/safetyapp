// routes/sos.js
import express from 'express';
import {
    sendAlert,
    getAllAlerts,
    resolveAlert,
    getAlert
} from '../controllers/sosController.js';
import { auth, requireRole } from '../middleware/auth.js';
import SOSAlert from '../models/SOSAlert.js'; // added missing import

const router = express.Router();

// Authenticated SOS trigger (requires user login)
router.post('/alert', auth, sendAlert);

// Open SOS trigger (emergency, no auth required)
router.post('/trigger', sendAlert);

// Get all alerts (staff only: security, admin, teacher)
router.get('/alerts', auth, requireRole(['security', 'admin', 'teacher']), getAllAlerts);

// Get specific alert
router.get('/alerts/:id', auth, requireRole(['security', 'admin', 'teacher']), getAlert);

// Resolve an alert
router.patch('/alerts/:id/resolve', auth, requireRole(['security', 'admin', 'teacher']), resolveAlert);

// Get user's SOS history
router.get('/history', auth, async (req, res) => {
    try {
        const alerts = await SOSAlert.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            alerts
        });
    } catch (error) {
        console.error('Error fetching SOS history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching SOS history',
            error: error.message
        });
    }
});

export default router;
