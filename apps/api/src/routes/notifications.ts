import { Router } from 'express';
import type { NotificationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const notificationInclude = {
  changeRequest: {
    select: {
      id: true,
      title: true,
      priority: true,
      moduleAffected: true,
      organization: { select: { id: true, name: true, code: true } },
      requestedBy: { select: { fullName: true } },
    },
  },
  actedBy: { select: { id: true, fullName: true } },
};

function actionRequiredStatuses(role: string) {
  if (role === 'CS_MEMBER') return ['ASSIGNED'] as const;
  return ['PENDING_APPROVAL', 'RETURNED_FOR_REASSIGN'] as const;
}

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  const role = req.role!;
  if (!['ADMIN', 'APPROVER', 'CS_MEMBER'].includes(role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const status = req.query.status as string | undefined;
  const limit = Math.min(50, Number(req.query.limit) || 20);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: req.userId!,
      ...(status ? { status: status as NotificationStatus } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: notificationInclude,
  });

  res.json({ notifications });
});

notificationsRouter.get('/pending-count', async (req: AuthRequest, res) => {
  const role = req.role!;
  if (!['ADMIN', 'APPROVER', 'CS_MEMBER'].includes(role)) {
    res.json({ count: 0 });
    return;
  }

  const statuses = actionRequiredStatuses(role);
  const count = await prisma.notification.count({
    where: {
      userId: req.userId!,
      status: { in: [...statuses] },
      isRead: false,
    },
  });
  res.json({ count });
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
    include: notificationInclude,
  });
  res.json({ notification: updated });
});

notificationsRouter.patch('/read-all', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId!, isRead: false },
    data: { isRead: true },
  });
  res.json({ ok: true });
});
