import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { getDatabase } from '../db/index.js';
import { User } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      requestId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Check if demo user fallback is available
    const db = await getDatabase();
    const defaultUser = await db.getUserById('11111111-1111-1111-1111-111111111111');
    if (defaultUser) {
      req.user = defaultUser;
      return next();
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication token required',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = AuthService.verifyToken(token);
    const db = await getDatabase();
    const user = await db.getUserById(decoded.sub);

    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The authenticated user could not be found',
          requestId: req.requestId || '',
          details: [],
        },
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authorization token',
        requestId: req.requestId || '',
        details: [err.message],
      },
    });
  }
}
