// authController.js (ESM version)
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';
import { sendPushNotification } from '../services/pushService.js';
import { USER_ROLES } from '../config/constants.js';
import { validateEmail, validatePassword } from '../utils/validators.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) console.warn('JWT_SECRET not set.');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Generate JWT token
export const generateToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRE,
    });
};

// ----------------------
// CONTROLLER FUNCTIONS
// ----------------------

export const register = async (req, res) => {
    try {
        const { name, email, password, role, studentId, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        const user = new User({
            name,
            email,
            password,
            role: role || USER_ROLES.STUDENT,
            studentId,
            phone
        });

        await user.save();

        // Generate verification token
        const verificationToken = jwt.sign(
            { id: user._id },
            process.env.JWT_VERIFICATION_SECRET,
            { expiresIn: '1d' }
        );

        user.verificationToken = verificationToken;
        await user.save();

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        await sendEmail(
            user.email,
            'Verify your UniSafe account',
            `Please click the following link to verify your email: ${verificationUrl}`
        );

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email for verification.',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (role && user.role !== role) {
            return res.status(401).json({ success: false, message: `Access denied for ${role} role` });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: 'Please verify your email before logging in' });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    studentId: user.studentId,
                    phone: user.phone,
                    isVerified: user.isVerified
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

// Guest login (no email verification required)
export const guestAuth = async (req, res) => {
    try {
        const guestUser = new User({
            name: 'Guest User',
            email: `guest_${Date.now()}@unisafe.com`,
            password: crypto.randomBytes(16).toString('hex'),
            role: USER_ROLES.GUEST,
            isVerified: true
        });

        await guestUser.save();

        const token = generateToken(guestUser);

        res.json({
            success: true,
            message: 'Guest login successful',
            data: {
                token,
                user: {
                    id: guestUser._id,
                    name: guestUser.name,
                    email: guestUser.email,
                    role: guestUser.role,
                    isVerified: guestUser.isVerified
                }
            }
        });
    } catch (error) {
        console.error('Guest auth error:', error);
        res.status(500).json({ success: false, message: 'Server error during guest login' });
    }
};

export const googleAuth = async (req, res) => {
    try {
        res.status(501).json({ success: false, message: 'Google authentication not implemented yet' });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ success: false, message: 'Server error during Google authentication' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -verificationToken -resetPasswordToken')
            .populate('trustedCircle.contact')
            .populate('emergencyContacts');

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching user data' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name, phone, studentId } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone, studentId },
            { new: true, runValidators: true }
        ).select('-password -verificationToken -resetPasswordToken');

        res.json({ success: true, message: 'Profile updated successfully', data: user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error updating profile' });
    }
};

export const updatePrivacySettings = async (req, res) => {
    try {
        const { privacySettings } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { privacySettings },
            { new: true }
        ).select('-password -verificationToken -resetPasswordToken');

        res.json({ success: true, message: 'Privacy settings updated successfully', data: user.privacySettings });
    } catch (error) {
        console.error('Update privacy settings error:', error);
        res.status(500).json({ success: false, message: 'Server error updating privacy settings' });
    }
};

// Update user preferences (like notifications, UI theme, etc.)
export const updatePreferences = async (req, res) => {
    try {
        const { preferences } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { preferences },
            { new: true }
        ).select('-password -verificationToken -resetPasswordToken');

        res.json({ success: true, message: 'Preferences updated successfully', data: user.preferences });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ success: false, message: 'Server error updating preferences' });
    }
};

// Manage trusted circle contacts
export const manageTrustedCircle = async (req, res) => {
    try {
        const { trustedCircle } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { trustedCircle },
            { new: true }
        ).populate('trustedCircle.contact');

        res.json({ success: true, message: 'Trusted circle updated successfully', data: user.trustedCircle });
    } catch (error) {
        console.error('Manage trusted circle error:', error);
        res.status(500).json({ success: false, message: 'Server error updating trusted circle' });
    }
};

// Manage emergency contacts
export const manageEmergencyContacts = async (req, res) => {
    try {
        const { emergencyContacts } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { emergencyContacts },
            { new: true }
        ).populate('emergencyContacts');

        res.json({ success: true, message: 'Emergency contacts updated successfully', data: user.emergencyContacts });
    } catch (error) {
        console.error('Manage emergency contacts error:', error);
        res.status(500).json({ success: false, message: 'Server error updating emergency contacts' });
    }
};

export const logout = async (req, res) => {
    try {
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Server error during logout' });
    }
};

// Forgot password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No user found with this email' });
        }

        const resetToken = jwt.sign({ id: user._id }, process.env.JWT_RESET_SECRET, { expiresIn: '1h' });
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        await sendEmail(user.email, 'Reset your UniSafe password', `Click here to reset: ${resetUrl}`);

        res.json({ success: true, message: 'Password reset instructions sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Server error during password reset' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Server error resetting password' });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid verification token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ success: false, message: 'Server error verifying email' });
    }
};

export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'No user found with this email' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email is already verified' });
        }

        const verificationToken = jwt.sign({ id: user._id }, process.env.JWT_VERIFICATION_SECRET, { expiresIn: '1d' });
        user.verificationToken = verificationToken;
        await user.save();

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        await sendEmail(user.email, 'Verify your UniSafe account', `Click here: ${verificationUrl}`);

        res.json({ success: true, message: 'Verification email sent successfully' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ success: false, message: 'Server error resending verification email' });
    }
};
