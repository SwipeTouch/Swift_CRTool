import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyAccessToken } from '../lib/jwt.js';

export interface AuthRequest extends Request {
  userId?: string;
  role?: UserRole;
  userEmail?: string;
  organizationId?: string | null;
  organizationCode?: string | null;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.userId = payload.sub;
    req.role = payload.role;
    req.userEmail = payload.email;
    req.organizationId = payload.organizationId;
    req.organizationCode = payload.organizationCode;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      res.status(403).json({ error: 'Forbidden', requiredRoles: roles });
      return;
    }
    next();
  };
}
