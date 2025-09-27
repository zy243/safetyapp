import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Malaysian Universities Data (same as frontend)
const MALAYSIAN_UNIVERSITIES = [
    {
        id: 'um',
        name: 'University of Malaya',
        location: { latitude: 3.1201, longitude: 101.6544 },
        center: { latitude: 3.1201, longitude: 101.6544 },
        coverageRadius: 2,
    },
    {
        id: 'upm',
        name: 'Universiti Putra Malaysia',
        location: { latitude: 2.9447, longitude: 101.6904 },
        center: { latitude: 2.9447, longitude: 101.6904 },
        coverageRadius: 3,
    },
    {
        id: 'ukm',
        name: 'Universiti Kebangsaan Malaysia',
        location: { latitude: 2.9214, longitude: 101.7758 },
        center: { latitude: 2.9214, longitude: 101.7758 },
        coverageRadius: 2.5,
    },
    {
        id: 'utm',
        name: 'Universiti Teknologi Malaysia',
        location: { latitude: 1.5583, longitude: 103.6370 },
        center: { latitude: 1.5583, longitude: 103.6370 },
        coverageRadius: 4,
    },
    {
        id: 'usm',
        name: 'Universiti Sains Malaysia',
        location: { latitude: 5.3568, longitude: 100.3012 },
        center: { latitude: 5.3568, longitude: 100.3012 },
        coverageRadius: 3,
    },
    {
        id: 'utp',
        name: 'Universiti Teknologi PETRONAS',
        location: { latitude: 4.3896, longitude: 100.9740 },
        center: { latitude: 4.3896, longitude: 100.9740 },
        coverageRadius: 1.5,
    },
    {
        id: 'mmu',
        name: 'Multimedia University',
        location: { latitude: 2.9268, longitude: 101.8715 },
        center: { latitude: 2.9268, longitude: 101.8715 },
        coverageRadius: 2,
    },
    {
        id: 'taylor',
        name: "Taylor's University",
        location: { latitude: 3.0653, longitude: 101.6008 },
        center: { latitude: 3.0653, longitude: 101.6008 },
        coverageRadius: 1,
    }
];

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Signup endpoint
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, universityId } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Find selected university
        const selectedUniversity = MALAYSIAN_UNIVERSITIES.find(u => u.id === universityId);
        if (!selectedUniversity) {
            return res.status(400).json({
                success: false,
                message: 'Invalid university selection'
            });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password,
            role: role || 'student',
            university: selectedUniversity
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                university: user.university
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user account'
        });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account has been deactivated'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Optional: Verify role if provided
        if (role && user.role !== role) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This account is registered as ${user.role}`
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                university: user.university,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login'
        });
    }
});

// Get universities list
router.get('/universities', (req, res) => {
    res.json({
        success: true,
        universities: MALAYSIAN_UNIVERSITIES
    });
});

export default router;