// usage: import requireRole from '../middleware/role.js';
// app.get('/admin', auth, requireRole(['teacher','security']), handler)

export default function (requiredRoles = []) {
    return (req, res, next) => {
        try {
            if (!req.user || !req.user.role) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
                // nobody required -> allow
                return next();
            }
            if (!requiredRoles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            next();
        } catch (err) {
            console.error('Role middleware error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    };
};
