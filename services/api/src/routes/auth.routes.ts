import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/auth/register', validateBody(RegisterSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    const result = await AuthService.register(email, password, displayName);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'USER_ALREADY_EXISTS') {
      res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email address already exists',
          requestId: req.requestId || '',
          details: [],
        },
      });
      return;
    }
    res.status(500).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to create user account',
        requestId: req.requestId || '',
        details: [],
      },
    });
  }
});

router.post('/auth/login', validateBody(LoginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password combination',
        requestId: req.requestId || '',
        details: [],
      },
    });
  }
});

router.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'User session not found',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }
  const { password_hash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

export default router;
