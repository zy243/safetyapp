// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET is not set in environment variables');
    process.exit(1);
}

/**
 * Main authentication middleware
 */
export const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authorization token missing or invalid' });
        }

        const token = authHeader.split(' ')[1];
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired' });
            if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
            throw err;
        }

        const user = await User.findById(payload.id).select('-password');
        if (!user) return res.status(401).json({ success: false, message: 'User not found' });
        if (user.status && user.status !== 'active') return res.status(403).json({ success: false, message: 'Account is not active' });

        req.user = user; // attach user to request
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ success: false, message: 'Server error during authentication' });
    }
};

/**
 * Role-based authorization middleware
 * @param {Array|string} roles - allowed roles
 */
export const requireRole = (roles = []) => {
    return (req, res, next) => {
        try {
            if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role)) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', ')
            });
        } catch (err) {
            console.error('Role middleware error:', err);
            res.status(500).json({ success: false, message: 'Server error during authorization' });
        }
    };
};

/**
 * Optional authentication (doesn’t fail if token missing/invalid)
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

        const token = authHeader.split(' ')[1];
        if (!token) return next();

        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch {
            return next(); // ignore invalid token
        }

        const user = await User.findById(payload.id).select('-password');
        if (user && (!user.status || user.status === 'active')) req.user = user;

        next();
    } catch (err) {
        console.error('Optional auth middleware error:', err);
        next();
    }
};

/**
 * Convenience middleware for common roles
 */
export const requireAdmin = requireRole(['admin']);
export const requireSecurity = requireRole(['security', 'admin']);
export const requireTeacher = requireRole(['teacher', 'admin']);

/**
 * Default export for backward compatibility
 */
export default {
    auth,
    requireRole,
    optionalAuth,
    requireAdmin,
    requireSecurity,
    requireTeacher
};
