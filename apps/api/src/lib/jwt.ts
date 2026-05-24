import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  organizationId: string | null;
  organizationCode: string | null;
}

const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-characters-long';

export function signAccessToken(payload: AccessTokenPayload): string {
  const expiresIn = process.env.JWT_ACCESS_EXPIRY ?? '8h';
  return jwt.sign(payload, accessSecret, { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret) as AccessTokenPayload;
}
