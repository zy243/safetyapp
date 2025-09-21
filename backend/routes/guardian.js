import express from 'express';
import { body, validationResult } from 'express-validator';
import GuardianSession from '../models/GuardianSession.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/guardian/start-session
// @desc    Start a new guardian session
// @access  Private
router.post('/start-session', auth, [
  body('destination').trim().isLength({ min: 1 }),
  body('estimatedArrival').isISO8601(),
  body('trustedContacts').isArray({ min: 1 }),
  body('checkInInterval').optional().isInt({ min: 1, max: 60 }),
  body('currentLocation.latitude').isFloat(),
  body('currentLocation.longitude').isFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { destination, estimatedArrival, trustedContacts, checkInInterval, currentLocation } = req.body;

    // Check if user already has an active session
    const existingSession = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (existingSession) {
      return res.status(400).json({ error: 'You already have an active guardian session' });
    }

    // Create new session
    const session = new GuardianSession({
      studentId: req.user._id,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      destination,
      estimatedArrival: new Date(estimatedArrival),
      trustedContacts,
      checkInInterval: checkInInterval || 5,
      currentLocation,
      route: [currentLocation]
    });

    await session.save();

    // Send notifications to trusted contacts
    await sendGuardianNotifications(session);

    res.status(201).json({ session });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error during session start' });
  }
});

// @route   PUT /api/guardian/update-location
// @desc    Update current location
// @access  Private
router.put('/update-location', auth, [
  body('latitude').isFloat(),
  body('longitude').isFloat()
], async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const session = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ error: 'No active session found' });
    }

    // Update current location
    session.currentLocation = {
      latitude,
      longitude,
      lastUpdated: new Date()
    };

    // Add to route
    session.route.push({
      latitude,
      longitude,
      timestamp: new Date()
    });

    await session.save();

    res.json({ session });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Server error during location update' });
  }
});

// @route   POST /api/guardian/check-in
// @desc    Student check-in
// @access  Private
router.post('/check-in', auth, [
  body('response').isIn(['yes', 'no']),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat()
], async (req, res) => {
  try {
    const { response, latitude, longitude } = req.body;

    const session = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ error: 'No active session found' });
    }

    // Add safety check
    session.safetyChecks.push({
      response,
      location: latitude && longitude ? { latitude, longitude } : undefined
    });

    session.lastCheckIn = new Date();
    session.nextCheckIn = new Date(Date.now() + session.checkInInterval * 60000);

    await session.save();

    res.json({ session });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error during check-in' });
  }
});

// @route   POST /api/guardian/end-session
// @desc    End guardian session
// @access  Private
router.post('/end-session', auth, async (req, res) => {
  try {
    const session = await GuardianSession.findOne({
      studentId: req.user._id,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ error: 'No active session found' });
    }

    session.isActive = false;
    session.status = 'completed';
    session.actualArrival = new Date();

    await session.save();

    // Send completion notifications
    await sendSessionEndNotifications(session);

    res.json({ session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Server error during session end' });
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
    }).populate('trustedContacts.contactId', 'name email phone');

    if (!session) {
      return res.status(404).json({ error: 'No active session found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Server error during session retrieval' });
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

// Helper function to send guardian notifications
async function sendGuardianNotifications(session) {
  try {
    for (const contact of session.trustedContacts) {
      const notification = new Notification({
        recipientId: contact.contactId,
        type: 'guardian_activated',
        title: 'Guardian Mode Activated',
        message: `A student has activated Guardian mode and is traveling to ${session.destination}.`,
        data: {
          sessionId: session._id,
          studentName: session.studentId.name,
          destination: session.destination,
          startTime: session.startTime
        },
        guardianSessionId: session._id,
        priority: 'high',
        channels: ['push', 'in_app']
      });

      await notification.save();
    }
  } catch (error) {
    console.error('Send guardian notifications error:', error);
  }
}

// Helper function to send session end notifications
async function sendSessionEndNotifications(session) {
  try {
    for (const contact of session.trustedContacts) {
      const notification = new Notification({
        recipientId: contact.contactId,
        type: 'guardian_completed',
        title: 'Guardian Session Completed',
        message: `The student has safely completed their journey to ${session.destination}.`,
        data: {
          sessionId: session._id,
          studentName: session.studentId.name,
          destination: session.destination,
          completedAt: session.actualArrival
        },
        guardianSessionId: session._id,
        priority: 'medium',
        channels: ['push', 'in_app']
      });

      await notification.save();
    }
  } catch (error) {
    console.error('Session end notification error:', error);
  }
}

export default router;
