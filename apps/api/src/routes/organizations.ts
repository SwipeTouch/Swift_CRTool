import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRoles, type AuthRequest } from '../middleware/auth.js';

export const organizationsRouter = Router();

const orgListInclude = {
  defaultApprover: { select: { id: true, fullName: true, email: true } },
  users: {
    where: { role: 'CLIENT' as const, isDesignatedRaiser: true, isActive: true },
    select: { id: true, email: true, fullName: true, isDesignatedRaiser: true },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { users: true, changeRequests: true } },
} satisfies Prisma.OrganizationInclude;

const raiserSelect = {
  id: true,
  email: true,
  fullName: true,
  isDesignatedRaiser: true,
  isActive: true,
};

organizationsRouter.use(requireAuth, requireRoles('ADMIN', 'APPROVER'));

organizationsRouter.get('/', async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    include: orgListInclude,
  });
  res.json({ organizations: orgs });
});

organizationsRouter.get('/:id', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: {
      ...orgListInclude,
      users: {
        where: { role: 'CLIENT' as const },
        select: raiserSelect,
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  res.json({ organization: org });
});

organizationsRouter.get('/:id/change-requests', async (req, res) => {
  const crs = await prisma.changeRequest.findMany({
    where: { organizationId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      requestedBy: { select: { fullName: true } },
      assignedStaff: { select: { fullName: true } },
    },
  });
  res.json({ changeRequests: crs });
});

interface DesignatedRaiserInput {
  id?: string;
  fullName: string;
  email: string;
  password?: string;
}

async function syncDesignatedRaisers(
  organizationId: string,
  raisers: DesignatedRaiserInput[],
  orgCode: string,
) {
  if (raisers.length > 2) {
    throw new Error('MAX_RAISERS');
  }

  const existing = await prisma.user.findMany({
    where: { organizationId, role: 'CLIENT', isDesignatedRaiser: true },
  });

  const keepIds = new Set(raisers.filter((r) => r.id).map((r) => r.id!));

  for (const u of existing) {
    if (!keepIds.has(u.id)) {
      await prisma.user.update({
        where: { id: u.id },
        data: { isDesignatedRaiser: false },
      });
    }
  }

  for (const r of raisers) {
    const email = r.email.trim().toLowerCase();
    if (r.id) {
      await prisma.user.update({
        where: { id: r.id },
        data: {
          fullName: r.fullName.trim(),
          email,
          isDesignatedRaiser: true,
          isActive: true,
          ...(r.password && { passwordHash: await bcrypt.hash(r.password, 12) }),
        },
      });
    } else {
      const passwordHash = await bcrypt.hash(r.password || 'changeme123', 12);
      await prisma.user.upsert({
        where: { email },
        update: {
          organizationId,
          fullName: r.fullName.trim(),
          role: 'CLIENT',
          isDesignatedRaiser: true,
          isActive: true,
          passwordHash,
        },
        create: {
          email,
          passwordHash,
          fullName: r.fullName.trim(),
          role: 'CLIENT',
          organizationId,
          isDesignatedRaiser: true,
        },
      });
    }
  }

  void orgCode;
}

function parseOrgBody(body: Record<string, unknown>) {
  return {
    name: body.name as string | undefined,
    code: body.code as string | undefined,
    segment: body.segment as string | undefined,
    country: body.country as string | undefined,
    city: body.city as string | undefined,
    address: body.address as string | undefined,
    contactPhone: body.contactPhone as string | undefined,
    contactEmail: body.contactEmail as string | undefined,
    primaryContactName: body.primaryContactName as string | undefined,
    slaDays: body.slaDays as number | undefined,
    status: body.status as 'active' | 'inactive' | undefined,
    defaultApproverId: body.defaultApproverId as string | null | undefined,
    designatedRaisers: body.designatedRaisers as DesignatedRaiserInput[] | undefined,
  };
}

organizationsRouter.post('/', requireRoles('ADMIN'), async (req: AuthRequest, res) => {
  const b = parseOrgBody(req.body);

  if (!b.name?.trim() || !b.code?.trim()) {
    res.status(400).json({ error: 'name and code are required' });
    return;
  }

  if (b.designatedRaisers && b.designatedRaisers.length > 2) {
    res.status(400).json({ error: 'Maximum 2 designated CR raisers allowed' });
    return;
  }

  try {
    const code = b.code.trim().toLowerCase();
    const org = await prisma.organization.create({
      data: {
        name: b.name.trim(),
        code,
        segment: b.segment?.trim() || 'mid-market',
        country: b.country?.trim() || 'India',
        city: b.city?.trim() || null,
        address: b.address?.trim() || null,
        contactPhone: b.contactPhone?.trim() || null,
        contactEmail: b.contactEmail?.trim().toLowerCase() || null,
        primaryContactName: b.primaryContactName?.trim() || null,
        slaDays: b.slaDays ?? 14,
        defaultApproverId: b.defaultApproverId || null,
      },
    });

    if (b.designatedRaisers?.length) {
      await syncDesignatedRaisers(org.id, b.designatedRaisers, code);
    }

    const full = await prisma.organization.findUnique({
      where: { id: org.id },
      include: orgListInclude,
    });
    res.status(201).json({ organization: full });
  } catch (e) {
    if (e instanceof Error && e.message === 'MAX_RAISERS') {
      res.status(400).json({ error: 'Maximum 2 designated CR raisers allowed' });
      return;
    }
    res.status(409).json({ error: 'Organization code or email already exists' });
  }
});

organizationsRouter.patch('/:id', requireRoles('ADMIN'), async (req, res) => {
  const b = parseOrgBody(req.body);

  if (b.designatedRaisers && b.designatedRaisers.length > 2) {
    res.status(400).json({ error: 'Maximum 2 designated CR raisers allowed' });
    return;
  }

  try {
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: {
        ...(b.name !== undefined && { name: b.name.trim() }),
        ...(b.segment !== undefined && { segment: b.segment }),
        ...(b.country !== undefined && { country: b.country }),
        ...(b.city !== undefined && { city: b.city?.trim() || null }),
        ...(b.address !== undefined && { address: b.address?.trim() || null }),
        ...(b.contactPhone !== undefined && { contactPhone: b.contactPhone?.trim() || null }),
        ...(b.contactEmail !== undefined && { contactEmail: b.contactEmail?.trim().toLowerCase() || null }),
        ...(b.primaryContactName !== undefined && {
          primaryContactName: b.primaryContactName?.trim() || null,
        }),
        ...(b.slaDays !== undefined && { slaDays: b.slaDays }),
        ...(b.status !== undefined && { status: b.status }),
        ...(b.defaultApproverId !== undefined && { defaultApproverId: b.defaultApproverId }),
      },
    });

    if (b.designatedRaisers) {
      await syncDesignatedRaisers(org.id, b.designatedRaisers, org.code);
    }

    const full = await prisma.organization.findUnique({
      where: { id: org.id },
      include: orgListInclude,
    });
    res.json({ organization: full });
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

organizationsRouter.delete('/:id', requireRoles('ADMIN'), async (req, res) => {
  const crCount = await prisma.changeRequest.count({ where: { organizationId: req.params.id } });
  if (crCount > 0) {
    res.status(400).json({
      error: 'Cannot delete institution with existing change requests. Set status to inactive instead.',
    });
    return;
  }

  await prisma.user.updateMany({
    where: { organizationId: req.params.id },
    data: { organizationId: null, isDesignatedRaiser: false },
  });
  await prisma.organization.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
