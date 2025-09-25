import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthPayload;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(allowedRoles: Array<'student' | 'guardian' | 'security' | 'staff'>) {
  return async function roleGuard(req: Request, res: Response, next: NextFunction) {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not set');
      const payload = jwt.verify(token, secret) as AuthPayload;
      req.auth = payload;
      // Lazy import to avoid cycle
      const { default: User } = await import('../models/User');
      const user = await User.findById(payload.userId).select('role');
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    } catch (_err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

