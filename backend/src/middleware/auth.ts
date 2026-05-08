import {NextFunction, Request, Response} from 'express';
import db from '../db';
import {verifyToken} from '../utils/auth';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({success: false, message: 'Authentication required.'});
  }

  const token = authorization.replace('Bearer ', '').trim();

  try {
    const payload = verifyToken(token);
    const result = await db.query('SELECT id FROM users WHERE id = $1', [payload.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({success: false, message: 'Invalid token.'});
    }

    req.userId = payload.userId;
    return next();
  } catch (error) {
    return res.status(401).json({success: false, message: 'Invalid or expired token.'});
  }
}
