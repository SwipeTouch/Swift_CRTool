import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signAccessToken } from '../lib/jwt.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password, organizationCode } = req.body as {
      email?: string;
      password?: string;
      organizationCode?: string;
    };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    if (!user?.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isClient = user.role === 'CLIENT';
    if (isClient) {
      const code = organizationCode?.trim().toLowerCase();
      if (!code) {
        res.status(400).json({ error: 'organizationCode is required for client login' });
        return;
      }
      if (!user.organization || user.organization.code !== code || user.organization.status !== 'active') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
    } else if (organizationCode?.trim()) {
      res.status(400).json({ error: 'organizationCode is only for client portal login' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      organizationId: user.organizationId,
      organizationCode: user.organization?.code ?? null,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name ?? null,
        organizationCode: user.organization?.code ?? null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { organization: true },
  });
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      organizationCode: user.organization?.code ?? null,
    },
  });
});
