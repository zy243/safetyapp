import express from 'express';
import { auth } from '../middleware/auth.js';
import {
    startFollowMe,
    updateLocation,
    stopFollowMe,
    getFollowMeStatus,
    getSharedLocation,
    getFollowMeHistory,
    updateSettings
} from '../controllers/followMeController.js';

const router = express.Router();

router.post('/start', auth, startFollowMe);
router.put('/location', auth, updateLocation);
router.post('/stop', auth, stopFollowMe);
router.get('/status', auth, getFollowMeStatus);
router.get('/shared/:userId', auth, getSharedLocation);
router.get('/history', auth, getFollowMeHistory);
router.put('/settings', auth, updateSettings);

export default router;
