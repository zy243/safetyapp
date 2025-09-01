import express from 'express';
import {
    register,
    login,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
    googleAuth,
    guestAuth,
    updateProfile,
    updatePrivacySettings,
    updatePreferences,
    manageTrustedCircle,
    manageEmergencyContacts
} from '../controllers/authController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// AUTH ROUTES
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/guest', guestAuth);

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/privacy', authenticate, updatePrivacySettings);
router.put('/preferences', authenticate, updatePreferences);
router.put('/trusted-circle', authenticate, manageTrustedCircle);
router.put('/emergency-contacts', authenticate, manageEmergencyContacts);

router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

export default router;
