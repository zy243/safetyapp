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

import { auth } from '../middleware/auth.js';

const router = express.Router();

// AUTH ROUTES
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/guest', guestAuth);
router.post('/logout', auth, logout);

router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put('/privacy', auth, updatePrivacySettings);
router.put('/preferences', auth, updatePreferences);
router.post('/trusted-circle', auth, manageTrustedCircle);
router.post('/emergency-contacts', auth, manageEmergencyContacts);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);

router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

export default router;
