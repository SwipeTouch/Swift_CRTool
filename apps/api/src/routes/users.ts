import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

export const usersRouter = Router();

const STAFF_ROLES: UserRole[] = ['ADMIN', 'APPROVER', 'CS_MEMBER'];

usersRouter.use(requireAuth, requireRoles('ADMIN', 'APPROVER'));

usersRouter.get('/', async (req, res) => {
  const role = req.query.role as UserRole | undefined;
  const organizationId = req.query.organizationId as string | undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(role && { role }),
      ...(organizationId && { organizationId }),
      ...(req.query.staff === 'true' && { role: { in: STAFF_ROLES } }),
    },
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      organizationId: true,
      isActive: true,
      organization: { select: { id: true, name: true, code: true } },
    },
  });
  res.json({ users });
});

usersRouter.post('/', requireRoles('ADMIN'), async (req, res) => {
  const { email, password, fullName, role, organizationId } = req.body as {
    email?: string;
    password?: string;
    fullName?: string;
    role?: UserRole;
    organizationId?: string;
  };

  if (!email?.trim() || !password || !fullName?.trim() || !role) {
    res.status(400).json({ error: 'email, password, fullName, and role are required' });
    return;
  }

  if (role === 'CLIENT' && !organizationId) {
    res.status(400).json({ error: 'organizationId is required for CLIENT users' });
    return;
  }

  if (role !== 'CLIENT' && organizationId) {
    res.status(400).json({ error: 'Internal staff must not have organizationId' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        role,
        organizationId: role === 'CLIENT' ? organizationId : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        organizationId: true,
        isActive: true,
      },
    });
    res.status(201).json({ user });
  } catch {
    res.status(409).json({ error: 'Email already registered' });
  }
});

usersRouter.patch('/:id', requireRoles('ADMIN'), async (req, res) => {
  const { fullName, isActive, role, organizationId } = req.body as {
    fullName?: string;
    isActive?: boolean;
    role?: UserRole;
    organizationId?: string | null;
  };

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(fullName !== undefined && { fullName: fullName.trim() }),
      ...(isActive !== undefined && { isActive }),
      ...(role !== undefined && { role }),
      ...(organizationId !== undefined && { organizationId }),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      organizationId: true,
      isActive: true,
    },
  });
  res.json({ user });
});
