import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set in env.');
}

// Auth middleware
export const auth = async (req, res, next) => {
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
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const user = await User.findById(payload.id).select('-password');
        if (!user) return res.status(401).json({ error: 'User not found' });

        if (user.status && user.status !== 'active') {
            return res.status(403).json({ error: 'Account suspended' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Role middleware
export const requireRole = (roles = []) => (req, res, next) => {
    try {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!Array.isArray(roles) || roles.length === 0) return next();

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    } catch (err) {
        console.error('Role middleware error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
