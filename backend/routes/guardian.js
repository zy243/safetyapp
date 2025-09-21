import express from 'express';
import { body, validationResult } from 'express-validator';
import GuardianSession from '../models/GuardianSession.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { auth } from '../middleware/auth.js';
import { sendPushNotification } from '../services/notificationService.js';

const router = express.Router();

// @route   POST /api/guardian/start-session
// @desc    Start a new guardian session
// @access  Private (Student)
router.post('/start-session', auth, [
  body('destination').trim().notEmpty(),
  body('estimatedArrival').isISO8601(),
  body('trustedContacts').isArray({ min: 1 }),
  body('checkInInterval').optional().isInt({ min: 1, max: 60 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can start guardian sessions' });
    }

    // Check if user already has an active session
    const existingSession = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (existingSession) {
      return res.status(400).json({ error: 'You already have an active guardian session' });
    }

    const {
      destination,
      estimatedArrival,
      trustedContacts,
      checkInInterval = 5,
      currentLocation
    } = req.body;

    // Create new guardian session
    const sessionId = `guardian_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const guardianSession = new GuardianSession({
      studentId: req.user._id,
      sessionId,
      destination,
      estimatedArrival: new Date(estimatedArrival),
      checkInInterval,
      currentLocation: currentLocation || {
        latitude: 0,
        longitude: 0,
        lastUpdated: new Date()
      },
      trustedContacts: trustedContacts.map(contact => ({
        ...contact,
        isNotified: false
      }))
    });

    await guardianSession.save();

    // Send notifications to trusted contacts
    const notificationPromises = trustedContacts.map(async (contact) => {
      const notification = new Notification({
        recipientId: contact.contactId,
        senderId: req.user._id,
        type: 'guardian_activated',
        title: 'Guardian Mode Activated',
        message: `${req.user.name} has activated Guardian mode and is traveling to ${destination}. You can monitor their journey in real-time.`,
        data: {
          sessionId: guardianSession._id,
          studentName: req.user.name,
          destination,
          estimatedArrival
        },
        priority: 'high',
        channels: ['push', 'in_app'],
        guardianSessionId: guardianSession._id
      });

      await notification.save();

      // Send push notification
      if (contact.pushToken) {
        await sendPushNotification(contact.pushToken, {
          title: 'Guardian Mode Activated',
          body: `${req.user.name} has activated Guardian mode`,
          data: {
            type: 'guardian_activated',
            sessionId: guardianSession._id.toString()
          }
        });
      }

      // Update contact notification status
      await GuardianSession.findByIdAndUpdate(guardianSession._id, {
        $set: {
          'trustedContacts.$[elem].isNotified': true,
          'trustedContacts.$[elem].notificationSentAt': new Date()
        }
      }, {
        arrayFilters: [{ 'elem.contactId': contact.contactId }]
      });
    });

    await Promise.all(notificationPromises);

    res.status(201).json({
      message: 'Guardian session started successfully',
      session: {
        id: guardianSession._id,
        sessionId: guardianSession.sessionId,
        destination: guardianSession.destination,
        startTime: guardianSession.startTime,
        estimatedArrival: guardianSession.estimatedArrival,
        isActive: guardianSession.isActive,
        trustedContacts: guardianSession.trustedContacts
      }
    });
  } catch (error) {
    console.error('Start guardian session error:', error);
    res.status(500).json({ error: 'Server error during guardian session start' });
  }
});

// @route   PUT /api/guardian/update-location
// @desc    Update current location during guardian session
// @access  Private (Student)
router.put('/update-location', auth, [
  body('latitude').isFloat(),
  body('longitude').isFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { latitude, longitude } = req.body;

    // Find active session
    const session = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ error: 'No active guardian session found' });
    }

    // Update location
    session.currentLocation = {
      latitude,
      longitude,
      lastUpdated: new Date()
    };

    // Add to route history
    session.route.push({
      latitude,
      longitude,
      timestamp: new Date()
    });

    await session.save();

    res.json({
      message: 'Location updated successfully',
      location: session.currentLocation
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Server error during location update' });
  }
});

// @route   POST /api/guardian/check-in
// @desc    Respond to safety check-in
// @access  Private (Student)
router.post('/check-in', auth, [
  body('response').isIn(['yes', 'no']),
  body('location').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { response, location } = req.body;

    // Find active session
    const session = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ error: 'No active guardian session found' });
    }

    // Add safety check
    session.safetyChecks.push({
      response,
      location: location || session.currentLocation
    });

    session.lastCheckIn = new Date();

    if (response === 'yes') {
      // Schedule next check-in
      session.nextCheckIn = new Date(Date.now() + session.checkInInterval * 60000);
    } else {
      // Escalate to emergency
      session.status = 'emergency';
      session.emergencyEscalated = true;
      session.emergencyEscalatedAt = new Date();

      // Notify trusted contacts and staff
      await notifyEmergencyEscalation(session);
    }

    await session.save();

    res.json({
      message: response === 'yes' ? 'Check-in recorded' : 'Emergency escalation initiated',
      nextCheckIn: session.nextCheckIn
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error during check-in' });
  }
});

// @route   POST /api/guardian/end-session
// @desc    End guardian session
// @access  Private (Student)
router.post('/end-session', auth, async (req, res) => {
  try {
    // Find active session
    const session = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ error: 'No active guardian session found' });
    }

    // End session
    session.isActive = false;
    session.status = 'completed';
    session.actualArrival = new Date();

    await session.save();

    // Notify trusted contacts
    await notifySessionEnd(session);

    res.json({
      message: 'Guardian session ended successfully',
      session: {
        id: session._id,
        duration: session.actualArrival - session.startTime,
        status: session.status
      }
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Server error during session end' });
  }
});

// @route   GET /api/guardian/sessions
// @desc    Get user's guardian sessions
// @access  Private
router.get('/sessions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { studentId: req.user._id };

    if (status) {
      query.status = status;
    }

    const sessions = await GuardianSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('studentId', 'name email');

    const total = await GuardianSession.countDocuments(query);

    res.json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error during sessions retrieval' });
  }
});

// @route   GET /api/guardian/active-session
// @desc    Get current active session
// @access  Private
router.get('/active-session', auth, async (req, res) => {
  try {
    const session = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    }).populate('studentId', 'name email');

    if (!session) {
      return res.status(404).json({ error: 'No active session found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Server error during active session retrieval' });
  }
});

// @route   GET /api/guardian/monitored-sessions
// @desc    Get sessions monitored by this guardian
// @access  Private
router.get('/monitored-sessions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { 
      'trustedContacts.contactId': req.user._id,
      isActive: true 
    };

    if (status) {
      query.status = status;
    }

    const sessions = await GuardianSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('studentId', 'name email studentId university');

    const total = await GuardianSession.countDocuments(query);

    res.json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get monitored sessions error:', error);
    res.status(500).json({ error: 'Server error during monitored sessions retrieval' });
  }
});

// Helper function to notify emergency escalation
async function notifyEmergencyEscalation(session) {
  try {
    const student = await User.findById(session.studentId);
    
    // Notify trusted contacts
    for (const contact of session.trustedContacts) {
      const notification = new Notification({
        recipientId: contact.contactId,
        senderId: session.studentId,
        type: 'guardian_emergency',
        title: 'Emergency Alert - Guardian Mode',
        message: `${student.name} has not responded to safety check-in and may need help. Their last known location has been shared.`,
        data: {
          sessionId: session._id,
          studentName: student.name,
          lastLocation: session.currentLocation,
          timestamp: new Date()
        },
        priority: 'urgent',
        channels: ['push', 'email', 'sms'],
        guardianSessionId: session._id
      });

      await notification.save();
    }

    // Notify security staff
    const securityStaff = await User.find({ role: 'security' });
    for (const staff of securityStaff) {
      const notification = new Notification({
        recipientId: staff._id,
        senderId: session.studentId,
        type: 'sos_alert',
        title: 'Student Emergency - Guardian Mode',
        message: `${student.name} (${student.studentId}) has not responded to safety check-in during Guardian mode.`,
        data: {
          sessionId: session._id,
          studentName: student.name,
          studentId: student.studentId,
          lastLocation: session.currentLocation,
          timestamp: new Date()
        },
        priority: 'urgent',
        channels: ['push', 'email'],
        guardianSessionId: session._id
      });

      await notification.save();
    }
  } catch (error) {
    console.error('Emergency escalation notification error:', error);
  }
}

// Helper function to notify session end
async function notifySessionEnd(session) {
  try {
    const student = await User.findById(session.studentId);
    
    for (const contact of session.trustedContacts) {
      const notification = new Notification({
        recipientId: contact.contactId,
        senderId: session.studentId,
        type: 'guardian_completed',
        title: 'Guardian Mode Completed',
        message: `${student.name} has safely completed their journey to ${session.destination}.`,
        data: {
          sessionId: session._id,
          studentName: student.name,
          destination: session.destination,
          duration: session.actualArrival - session.startTime
        },
        priority: 'medium',
        channels: ['push', 'in_app'],
        guardianSessionId: session._id
      });

      await notification.save();
    }
  } catch (error) {
    console.error('Session end notification error:', error);
  }
}

// @route   GET /api/guardian/session/:sessionId
// @desc    Get session details
// @access  Private
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await GuardianSession.findById(sessionId)
      .populate('studentId', 'name email studentId university')
      .populate('trustedContacts.contactId', 'name email phone');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if the current user is authorized to view this session
    const isStudent = session.studentId._id.toString() === req.user._id.toString();
    const isGuardian = session.trustedContacts.some(
      contact => contact.contactId._id.toString() === req.user._id.toString()
    );

    if (!isStudent && !isGuardian) {
      return res.status(403).json({ error: 'Not authorized to view this session' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({ error: 'Server error during session details retrieval' });
  }
});

export default router;
