import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) console.warn('JWT_SECRET not set.');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRE,
    });
};

// Register User
export const register = async (req, res) => {
    try {
        const { name, email, password, phone, role, studentId, staffId } = req.body;

        if (!name || !email || !password || !role)
            return res.status(400).json({ success: false, message: 'Missing fields' });

        if (!['student', 'teacher', 'security', 'staff'].includes(role))
            return res.status(400).json({ success: false, message: 'Invalid role' });

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ success: false, message: 'Email already used' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            name,
            email,
            password: hashedPassword,
            phone: phone || '',
            role,
            isVerified: false
        };

        // Add student/staff ID if provided
        if (role === 'student' && studentId) {
            userData.studentId = studentId;
        } else if (['teacher', 'staff'].includes(role) && staffId) {
            userData.staffId = staffId;
        }

        const user = await User.create(userData);

        // Email verification
        const verificationToken = crypto.randomBytes(20).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();

        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
        const message = `<h1>Email Verification</h1><p>Click to verify: <a href="${verificationUrl}">${verificationUrl}</a></p>`;

        try {
            await sendEmail({ email: user.email, subject: 'Verify your email', message });
        } catch (err) {
            user.verificationToken = undefined;
            await user.save();
            return res.status(500).json({ success: false, message: 'Email could not be sent. Please try again.' });
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email to verify your account before logging in.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                studentId: user.studentId,
                staffId: user.staffId,
                isVerified: user.isVerified
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Guest Mode Authentication
export const guestAuth = async (req, res) => {
    try {
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({ success: false, message: 'Device ID is required for guest mode' });
        }

        // Check if guest user already exists for this device
        let guestUser = await User.findOne({
            role: 'guest',
            'devices.deviceId': deviceId
        });

        if (!guestUser) {
            // Create new guest user
            guestUser = await User.create({
                name: `Guest_${deviceId.slice(-6)}`,
                email: `guest_${deviceId}@campus-safety.local`,
                password: crypto.randomBytes(16).toString('hex'),
                role: 'guest',
                isVerified: true,
                devices: [{
                    deviceId,
                    deviceType: 'mobile',
                    lastActive: new Date()
                }]
            });
        } else {
            // Update last active time
            const deviceIndex = guestUser.devices.findIndex(d => d.deviceId === deviceId);
            if (deviceIndex >= 0) {
                guestUser.devices[deviceIndex].lastActive = new Date();
            } else {
                guestUser.devices.push({
                    deviceId,
                    deviceType: 'mobile',
                    lastActive: new Date()
                });
            }
            await guestUser.save();
        }

        const token = generateToken(guestUser);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: guestUser._id,
                name: guestUser.name,
                email: guestUser.email,
                role: guestUser.role,
                isGuest: true
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Login User
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Missing fields' });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please verify your email before logging in. Check your inbox for the verification link.',
                requiresVerification: true
            });
        }

        const token = generateToken(user);
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                studentId: user.studentId,
                staffId: user.staffId,
                avatar: user.avatar,
                isVerified: user.isVerified
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Google Authentication
export const googleAuth = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Google token is required' });
        }

        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const { name, email, picture, sub: googleId } = ticket.getPayload();

        // Check if user already exists
        let user = await User.findOne({
            $or: [{ email }, { googleId }]
        });

        if (user) {
            // Update googleId if not set
            if (!user.googleId) {
                user.googleId = googleId;
                user.avatar = picture;
                await user.save();
            }
        } else {
            // Create new user with Google data
            user = await User.create({
                name,
                email,
                googleId,
                avatar: picture,
                password: crypto.randomBytes(16).toString('hex'), // Random password
                role: 'student', // Default role
                isVerified: true // Google emails are verified
            });
        }

        const authToken = generateToken(user);

        res.status(200).json({
            success: true,
            token: authToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                studentId: user.studentId,
                staffId: user.staffId
            }
        });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(500).json({ success: false, message: 'Google authentication failed' });
    }
};

// Logout User
export const logout = (req, res) => {
    res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// Get current user profile
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                studentId: user.studentId,
                staffId: user.staffId,
                trustedCircle: user.trustedCircle,
                emergencyContacts: user.emergencyContacts,
                privacySettings: user.privacySettings,
                preferences: user.preferences,
                followMe: user.followMe
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { name, phone, studentId, staffId, avatar } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Update allowed fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (avatar) user.avatar = avatar;

        if (user.role === 'student' && studentId) {
            user.studentId = studentId;
        } else if (['teacher', 'staff'].includes(user.role) && staffId) {
            user.staffId = staffId;
        }

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                studentId: user.studentId,
                staffId: user.staffId
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update privacy settings
export const updatePrivacySettings = async (req, res) => {
    try {
        const { anonymousMode, locationSharing, shareWithTrustedCircle, shareWithEmergencyContacts } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (anonymousMode !== undefined) user.privacySettings.anonymousMode = anonymousMode;
        if (locationSharing !== undefined) user.privacySettings.locationSharing = locationSharing;
        if (shareWithTrustedCircle !== undefined) user.privacySettings.shareWithTrustedCircle = shareWithTrustedCircle;
        if (shareWithEmergencyContacts !== undefined) user.privacySettings.shareWithEmergencyContacts = shareWithEmergencyContacts;

        await user.save();

        res.status(200).json({
            success: true,
            privacySettings: user.privacySettings
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update app preferences
export const updatePreferences = async (req, res) => {
    try {
        const { language, theme, notifications } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (language) user.preferences.language = language;
        if (theme) user.preferences.theme = theme;
        if (notifications) {
            Object.assign(user.preferences.notifications, notifications);
        }

        await user.save();

        res.status(200).json({
            success: true,
            preferences: user.preferences
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Manage trusted circle
export const manageTrustedCircle = async (req, res) => {
    try {
        const { action, contact } = req.body; // action: 'add', 'update', 'remove'

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        switch (action) {
            case 'add':
                if (!contact.name || !contact.phone) {
                    return res.status(400).json({ success: false, message: 'Name and phone are required' });
                }
                user.trustedCircle.push(contact);
                break;

            case 'update':
                const updateIndex = user.trustedCircle.findIndex(c => c._id.toString() === contact._id);
                if (updateIndex === -1) {
                    return res.status(404).json({ success: false, message: 'Contact not found' });
                }
                Object.assign(user.trustedCircle[updateIndex], contact);
                break;

            case 'remove':
                const removeIndex = user.trustedCircle.findIndex(c => c._id.toString() === contact._id);
                if (removeIndex === -1) {
                    return res.status(404).json({ success: false, message: 'Contact not found' });
                }
                user.trustedCircle.splice(removeIndex, 1);
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        await user.save();

        res.status(200).json({
            success: true,
            trustedCircle: user.trustedCircle
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Manage emergency contacts
export const manageEmergencyContacts = async (req, res) => {
    try {
        const { action, contact } = req.body; // action: 'add', 'update', 'remove'

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        switch (action) {
            case 'add':
                if (!contact.name || !contact.phone) {
                    return res.status(400).json({ success: false, message: 'Name and phone are required' });
                }
                user.emergencyContacts.push(contact);
                break;

            case 'update':
                const updateIndex = user.emergencyContacts.findIndex(c => c._id.toString() === contact._id);
                if (updateIndex === -1) {
                    return res.status(404).json({ success: false, message: 'Contact not found' });
                }
                Object.assign(user.emergencyContacts[updateIndex], contact);
                break;

            case 'remove':
                const removeIndex = user.emergencyContacts.findIndex(c => c._id.toString() === contact._id);
                if (removeIndex === -1) {
                    return res.status(404).json({ success: false, message: 'Contact not found' });
                }
                user.emergencyContacts.splice(removeIndex, 1);
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        await user.save();

        res.status(200).json({
            success: true,
            emergencyContacts: user.emergencyContacts
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'No user found' });

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;
        const message = `<h1>Password Reset</h1><p>Click to reset: <a href="${resetUrl}">${resetUrl}</a></p>`;

        try {
            await sendEmail({ email: user.email, subject: 'Password Reset', message });
            res.status(200).json({ success: true, message: 'Password reset email sent' });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            res.status(500).json({ success: false, message: 'Email could not be sent' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Verify Email
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid token' });

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Resend Verification Email
export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email is already verified' });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();

        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
        const message = `<h1>Email Verification</h1><p>Click to verify: <a href="${verificationUrl}">${verificationUrl}</a></p>`;

        try {
            await sendEmail({ email: user.email, subject: 'Verify your email', message });
            res.status(200).json({ success: true, message: 'Verification email sent successfully' });
        } catch (err) {
            user.verificationToken = undefined;
            await user.save();
            res.status(500).json({ success: false, message: 'Email could not be sent. Please try again.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};