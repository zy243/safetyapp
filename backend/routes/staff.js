import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import SOSAlert from '../models/SOSAlert.js';
import GuardianSession from '../models/GuardianSession.js';
import Notification from '../models/Notification.js';
import { auth, requireRole } from '../middleware/auth.js';
import { sendPushNotification } from '../services/notificationService.js';

const router = express.Router();

// @route   GET /api/staff/sos-monitoring
// @desc    Get SOS alerts for monitoring
// @access  Private (Staff/Security)
router.get('/sos-monitoring', auth, requireRole('staff', 'security', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    const alerts = await SOSAlert.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('studentId', 'name email phone studentId university')
      .populate('assignedStaff.staffId', 'name email phone')
      .populate('response.acknowledgedBy', 'name email')
      .populate('response.resolvedBy', 'name email');

    const total = await SOSAlert.countDocuments(query);

    // Get statistics
    const stats = await SOSAlert.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      alerts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      statistics: stats
    });
  } catch (error) {
    console.error('Get SOS monitoring error:', error);
    res.status(500).json({ error: 'Server error during SOS monitoring retrieval' });
  }
});

// @route   PUT /api/staff/sos-alert/:alertId/acknowledge
// @desc    Acknowledge an SOS alert
// @access  Private (Staff/Security)
router.put('/sos-alert/:alertId/acknowledge', auth, requireRole('staff', 'security', 'admin'), [
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { alertId } = req.params;
    const { notes } = req.body;

    const alert = await SOSAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    // Update alert
    alert.response.acknowledgedBy = req.user._id;
    alert.response.acknowledgedAt = new Date();
    alert.status = 'acknowledged';

    if (notes) {
      alert.response.notes = notes;
    }

    await alert.save();

    // Notify student
    await notifyStudent(alert.studentId, {
      title: 'SOS Alert Acknowledged',
      message: 'Your SOS alert has been acknowledged by security staff. Help is on the way.',
      data: {
        type: 'sos_acknowledged',
        alertId: alert.alertId,
        acknowledgedBy: req.user.name
      }
    });

    res.json({
      message: 'SOS alert acknowledged successfully',
      alert: {
        id: alert._id,
        status: alert.status,
        acknowledgedAt: alert.response.acknowledgedAt
      }
    });
  } catch (error) {
    console.error('Acknowledge SOS alert error:', error);
    res.status(500).json({ error: 'Server error during SOS alert acknowledgment' });
  }
});

// @route   PUT /api/staff/sos-alert/:alertId/resolve
// @desc    Resolve an SOS alert
// @access  Private (Staff/Security)
router.put('/sos-alert/:alertId/resolve', auth, requireRole('staff', 'security', 'admin'), [
  body('resolution').trim().notEmpty(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { alertId } = req.params;
    const { resolution, notes } = req.body;

    const alert = await SOSAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    // Update alert
    alert.response.resolvedBy = req.user._id;
    alert.response.resolvedAt = new Date();
    alert.response.resolution = resolution;
    alert.status = 'resolved';

    if (notes) {
      alert.response.notes = notes;
    }

    await alert.save();

    // Notify student
    await notifyStudent(alert.studentId, {
      title: 'SOS Alert Resolved',
      message: 'Your SOS alert has been resolved by security staff.',
      data: {
        type: 'sos_resolved',
        alertId: alert.alertId,
        resolvedBy: req.user.name,
        resolution
      }
    });

    res.json({
      message: 'SOS alert resolved successfully',
      alert: {
        id: alert._id,
        status: alert.status,
        resolvedAt: alert.response.resolvedAt
      }
    });
  } catch (error) {
    console.error('Resolve SOS alert error:', error);
    res.status(500).json({ error: 'Server error during SOS alert resolution' });
  }
});

// @route   GET /api/staff/guardian-sessions
// @desc    Get active guardian sessions for monitoring
// @access  Private (Staff/Security)
router.get('/guardian-sessions', auth, requireRole('staff', 'security', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { isActive: true };

    if (status) {
      query.status = status;
    }

    const sessions = await GuardianSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('studentId', 'name email phone studentId university')
      .populate('trustedContacts.contactId', 'name phone');

    const total = await GuardianSession.countDocuments(query);

    res.json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get guardian sessions error:', error);
    res.status(500).json({ error: 'Server error during guardian sessions retrieval' });
  }
});

// @route   GET /api/staff/guardian-session/:sessionId
// @desc    Get specific guardian session details
// @access  Private (Staff/Security)
router.get('/guardian-session/:sessionId', auth, requireRole('staff', 'security', 'admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await GuardianSession.findById(sessionId)
      .populate('studentId', 'name email phone studentId university')
      .populate('trustedContacts.contactId', 'name phone');

    if (!session) {
      return res.status(404).json({ error: 'Guardian session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get guardian session error:', error);
    res.status(500).json({ error: 'Server error during guardian session retrieval' });
  }
});

// @route   GET /api/staff/dashboard
// @desc    Get staff dashboard data
// @access  Private (Staff/Security/Admin)
router.get('/dashboard', auth, requireRole('staff', 'security', 'admin'), async (req, res) => {
  try {
    // Get active SOS alerts
    const activeSOS = await SOSAlert.find({ status: 'active' })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('studentId', 'name studentId university');

    // Get active guardian sessions
    const activeSessions = await GuardianSession.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('studentId', 'name studentId university');

    // Get recent alerts
    const recentAlerts = await SOSAlert.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('studentId', 'name studentId');

    // Get statistics
    const sosStats = await SOSAlert.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const sessionStats = await GuardianSession.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get today's alerts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAlerts = await SOSAlert.countDocuments({
      timestamp: { $gte: today }
    });

    res.json({
      activeSOS,
      activeSessions,
      recentAlerts,
      statistics: {
        sos: sosStats,
        sessions: sessionStats,
        todayAlerts
      }
    });
  } catch (error) {
    console.error('Get staff dashboard error:', error);
    res.status(500).json({ error: 'Server error during dashboard retrieval' });
  }
});

// @route   GET /api/staff/students
// @desc    Get all students
// @access  Private (Staff/Security/Admin)
router.get('/students', auth, requireRole('staff', 'security', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, university } = req.query;
    const query = { role: 'student' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    if (university) {
      query.university = university;
    }

    const students = await User.find(query)
      .select('-password -emergencyContacts')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Server error during students retrieval' });
  }
});

// @route   GET /api/staff/student/:studentId
// @desc    Get specific student details
// @access  Private (Staff/Security/Admin)
router.get('/student/:studentId', auth, requireRole('staff', 'security', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId)
      .select('-password');

    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get student's recent SOS alerts
    const recentSOS = await SOSAlert.find({ studentId })
      .sort({ timestamp: -1 })
      .limit(5);

    // Get student's recent guardian sessions
    const recentSessions = await GuardianSession.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      student,
      recentSOS,
      recentSessions
    });
  } catch (error) {
    console.error('Get student details error:', error);
    res.status(500).json({ error: 'Server error during student details retrieval' });
  }
});

// Helper function to notify student
async function notifyStudent(studentId, notification) {
  try {
    const student = await User.findById(studentId);
    if (!student || !student.pushToken) return;

    await sendPushNotification(student.pushToken, notification);

    // Also save to notifications collection
    const notificationDoc = new Notification({
      recipientId: studentId,
      type: 'system_notification',
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: 'medium',
      channels: ['push', 'in_app']
    });

    await notificationDoc.save();
  } catch (error) {
    console.error('Student notification error:', error);
  }
}

export default router;
