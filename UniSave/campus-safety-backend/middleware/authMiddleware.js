import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const secret = process.env.JWT_SECRET;

export default async function (req, res, next) {
    const auth = req.header('Authorization');
    if (!auth) return res.status(401).json({ error: 'No token' });
    const token = auth.replace('Bearer ', '');
    try {
        const payload = jwt.verify(token, secret);
        const user = await User.findById(payload.id).select('-passwordHash');
        if (!user) return res.status(401).json({ error: 'Invalid token' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token invalid or expired' });
    }
};
// Compare this snippet from models/SOSAlert.js:
// const mongoose = require('mongoose');
// const { Schema } = mongoose;