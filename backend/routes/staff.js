import express from 'express';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/staff/dashboard
// @desc    Get staff dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    res.json({ message: 'Staff dashboard endpoint' });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
