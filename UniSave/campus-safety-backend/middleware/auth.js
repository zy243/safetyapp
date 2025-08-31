// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set in env.');
}

// Auth middleware
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch latest user from DB
        const user = await User.findById(payload.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.status && user.status !== 'active') {
            return res.status(403).json({ error: 'Account suspended' });
        }

        req.user = user; // attach user to request
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export default auth;
