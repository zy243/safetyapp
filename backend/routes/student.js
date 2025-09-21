import express from 'express';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/student/dashboard
// @desc    Get student dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    res.json({ message: 'Student dashboard endpoint' });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
