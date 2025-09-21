import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import GuardianSession from '../models/GuardianSession.js';
import SOSAlert from '../models/SOSAlert.js';
import { auth } from '../middleware/auth.js';
import { sendPushNotification } from '../services/notificationService.js';

const router = express.Router();

// @route   GET /api/student/profile
// @desc    Get student profile
// @access  Private (Student)
router.get('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student role required.' });
    }

    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        avatar: req.user.avatar,
        phone: req.user.phone,
        university: req.user.university,
        studentId: req.user.studentId,
        emergencyContacts: req.user.emergencyContacts,
        preferences: req.user.preferences,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error during profile retrieval' });
  }
});

// @route   PUT /api/student/profile
// @desc    Update student profile
// @access  Private (Student)
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('phone').optional().trim(),
  body('university').optional().trim(),
  body('studentId').optional().trim(),
  body('emergencyContacts').optional().isArray()
], async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student role required.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, phone, university, studentId, emergencyContacts, preferences } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (university) updateData.university = university;
    if (studentId) updateData.studentId = studentId;
    if (emergencyContacts) updateData.emergencyContacts = emergencyContacts;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        university: user.university,
        studentId: user.studentId,
        emergencyContacts: user.emergencyContacts,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
});

// @route   POST /api/student/sos
// @desc    Send SOS alert
// @access  Private (Student)
router.post('/sos', auth, [
  body('location.latitude').isFloat(),
  body('location.longitude').isFloat(),
  body('description').optional().trim(),
  body('media').optional().isArray()
], async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student role required.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { location, description, media = [] } = req.body;

    // Create SOS alert
    const alertId = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sosAlert = new SOSAlert({
      studentId: req.user._id,
      alertId,
      location,
      description,
      media,
      priority: 'critical'
    });

    await sosAlert.save();

    // Notify emergency contacts
    await notifyEmergencyContacts(req.user, sosAlert);

    // Notify security staff
    await notifySecurityStaff(req.user, sosAlert);

    res.status(201).json({
      message: 'SOS alert sent successfully',
      alert: {
        id: sosAlert._id,
        alertId: sosAlert.alertId,
        status: sosAlert.status,
        timestamp: sosAlert.timestamp
      }
    });
  } catch (error) {
    console.error('SOS alert error:', error);
    res.status(500).json({ error: 'Server error during SOS alert' });
  }
});

// @route   GET /api/student/sos-history
// @desc    Get SOS alert history
// @access  Private (Student)
router.get('/sos-history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student role required.' });
    }

    const { page = 1, limit = 10 } = req.query;

    const alerts = await SOSAlert.find({ studentId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedStaff.staffId', 'name email phone');

    const total = await SOSAlert.countDocuments({ studentId: req.user._id });

    res.json({
      alerts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get SOS history error:', error);
    res.status(500).json({ error: 'Server error during SOS history retrieval' });
  }
});

// @route   GET /api/student/guardian-sessions
// @desc    Get student's guardian sessions
// @access  Private (Student)
router.get('/guardian-sessions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student role required.' });
    }

    const { page = 1, limit = 10, status } = req.query;
    const query = { studentId: req.user._id };

    if (status) {
      query.status = status;
    }

    const sessions = await GuardianSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
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

// @route   GET /api/student/dashboard
// @desc    Get student dashboard data
// @access  Private (Student)
router.get('/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student role required.' });
    }

    // Get active guardian session
    const activeSession = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    // Get recent SOS alerts
    const recentSOS = await SOSAlert.find({ studentId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(5);

    // Get recent guardian sessions
    const recentSessions = await GuardianSession.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get statistics
    const totalSessions = await GuardianSession.countDocuments({ studentId: req.user._id });
    const totalSOS = await SOSAlert.countDocuments({ studentId: req.user._id });
    const activeSessions = await GuardianSession.countDocuments({ 
      studentId: req.user._id, 
      isActive: true 
    });

    res.json({
      activeSession,
      recentSOS,
      recentSessions,
      statistics: {
        totalSessions,
        totalSOS,
        activeSessions
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Server error during dashboard retrieval' });
  }
});

// Helper function to notify emergency contacts
async function notifyEmergencyContacts(student, sosAlert) {
  try {
    for (const contact of student.emergencyContacts) {
      const notification = {
        title: 'SOS Alert - Emergency',
        body: `${student.name} has sent an SOS alert and may need immediate help.`,
        data: {
          type: 'sos_alert',
          alertId: sosAlert.alertId,
          studentName: student.name,
          location: sosAlert.location
        }
      };

      // Add to notifications collection
      const notificationDoc = new (await import('../models/Notification.js')).default({
        recipientId: contact.contactId || null, // If contact is not a user
        senderId: student._id,
        type: 'sos_alert',
        title: notification.title,
        message: notification.body,
        data: notification.data,
        priority: 'urgent',
        channels: ['push', 'email', 'sms']
      });

      await notificationDoc.save();

      // Send push notification if contact has push token
      if (contact.pushToken) {
        await sendPushNotification(contact.pushToken, notification);
      }
    }
  } catch (error) {
    console.error('Emergency contacts notification error:', error);
  }
}

// Helper function to notify security staff
async function notifySecurityStaff(student, sosAlert) {
  try {
    const securityStaff = await User.find({ role: 'security' });
    
    for (const staff of securityStaff) {
      const notification = {
        title: 'SOS Alert - Student Emergency',
        body: `${student.name} (${student.studentId}) has sent an SOS alert.`,
        data: {
          type: 'sos_alert',
          alertId: sosAlert.alertId,
          studentName: student.name,
          studentId: student.studentId,
          location: sosAlert.location
        }
      };

      // Add to notifications collection
      const notificationDoc = new (await import('../models/Notification.js')).default({
        recipientId: staff._id,
        senderId: student._id,
        type: 'sos_alert',
        title: notification.title,
        message: notification.body,
        data: notification.data,
        priority: 'urgent',
        channels: ['push', 'email']
      });

      await notificationDoc.save();

      // Send push notification
      if (staff.pushToken) {
        await sendPushNotification(staff.pushToken, notification);
      }
    }
  } catch (error) {
    console.error('Security staff notification error:', error);
  }
}

export default router;
