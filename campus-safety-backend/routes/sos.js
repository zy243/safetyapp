import express from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import SOSAlert from '../models/SOSAlert.js';
import { sendAlert } from '../controllers/sosController.js';

const router = express.Router();

// Simple test route
router.get('/', (req, res) => res.send('SOS API is running...'));

// Create SOS alert (authenticated)
router.post('/alert', auth, sendAlert);

// Open/manual trigger
router.post('/sos', sendAlert);

// Get alerts for authenticated user
router.get('/mine', auth, async (req, res) => {
    try {
        const alerts = await SOSAlert.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ alerts });
    } catch (err) {
        console.error('Mine alerts error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Teacher/security creates SOS
router.post('/create', auth, requireRole(['teacher', 'security']), (req, res) => {
    res.json({ message: 'SOS created successfully' });
});

// Resolve alert (teacher/security only)
router.patch('/:id/resolve', auth, requireRole(['teacher', 'security']), async (req, res) => {
    try {
        const alert = await SOSAlert.findById(req.params.id);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });

        alert.status = 'resolved';
        alert.handledBy = req.user._id;
        await alert.save();

        const populated = await SOSAlert.findById(alert._id)
            .populate('user', 'name role')
            .populate('handledBy', 'name role');

        const io = req.app.get('io');
        if (io) {
            io.emit('sos_resolved', {
                id: populated._id,
                status: populated.status,
                handledBy: populated.handledBy ? { id: populated.handledBy._id, name: populated.handledBy.name } : null,
                resolvedAt: new Date(),
            });
        }

        res.json({ alert: populated });
    } catch (err) {
        console.error('Resolve error', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
