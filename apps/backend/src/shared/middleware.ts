import { Request, Response, NextFunction } from 'express';
import { JWTService } from './jwt.ts';
import { User } from '../features/auth/auth.model.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token =
      JWTService.extractTokenFromHeader(req.headers.authorization) ||
      JWTService.extractTokenFromCookie(req.cookies);

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const payload = JWTService.verifyToken(token);

    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      userId: payload.userId,
      username: payload.username,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token =
      JWTService.extractTokenFromHeader(req.headers.authorization) ||
      JWTService.extractTokenFromCookie(req.cookies);

    if (token) {
      const payload = JWTService.verifyToken(token);
      const user = await User.findById(payload.userId);

      if (user) {
        req.user = {
          userId: payload.userId,
          username: payload.username,
        };
      }
    }

    next();
  } catch (error) {
    next();
  }
};
