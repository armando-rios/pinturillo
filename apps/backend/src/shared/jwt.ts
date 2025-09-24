import jwt from 'jsonwebtoken';
import { config } from './config.ts';

export interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export class JWTService {
  private static readonly SECRET = config.JWT_SECRET;
  private static readonly EXPIRES_IN = '7d';

  static generateToken(payload: { userId: string; username: string }): string {
    return jwt.sign(payload, this.SECRET, {
      expiresIn: this.EXPIRES_IN,
    });
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static extractTokenFromCookie(cookies: Record<string, string>): string | null {
    return cookies.token || null;
  }
}
