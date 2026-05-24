import type { NotificationStatus } from '@prisma/client';
import { prisma } from './prisma.js';

const APPROVER_ROLES = ['ADMIN', 'APPROVER'] as const;

export async function notifyApproversNewCr(changeRequestId: string) {
  const recipients = await prisma.user.findMany({
    where: { role: { in: [...APPROVER_ROLES] }, isActive: true },
    select: { id: true },
  });

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      changeRequestId,
      status: 'PENDING_APPROVAL' as NotificationStatus,
    })),
    skipDuplicates: true,
  });
}

export async function resolveApproverNotifications(
  changeRequestId: string,
  status: 'APPROVED' | 'REJECTED',
  actedById: string,
) {
  await prisma.notification.updateMany({
    where: { changeRequestId, status: 'PENDING_APPROVAL' },
    data: {
      status,
      actedById,
      actedAt: new Date(),
      isRead: false,
    },
  });
}

export async function notifyAdminsCrReturned(
  changeRequestId: string,
  returnedById: string,
  note: string,
) {
  const recipients = await prisma.user.findMany({
    where: { role: { in: [...APPROVER_ROLES] }, isActive: true },
    select: { id: true },
  });

  for (const r of recipients) {
    await prisma.notification.upsert({
      where: {
        userId_changeRequestId: { userId: r.id, changeRequestId },
      },
      create: {
        userId: r.id,
        changeRequestId,
        status: 'RETURNED_FOR_REASSIGN',
        actedById: returnedById,
        actedAt: new Date(),
        isRead: false,
      },
      update: {
        status: 'RETURNED_FOR_REASSIGN',
        actedById: returnedById,
        actedAt: new Date(),
        isRead: false,
      },
    });
  }

  void note;
}

export async function resolveReturnedNotifications(changeRequestId: string, actedById: string) {
  await prisma.notification.updateMany({
    where: { changeRequestId, status: 'RETURNED_FOR_REASSIGN' },
    data: {
      status: 'APPROVED',
      actedById,
      actedAt: new Date(),
      isRead: false,
    },
  });
}

export async function notifyStaffAssigned(changeRequestId: string, staffUserId: string, assignedById: string) {
  await prisma.notification.upsert({
    where: {
      userId_changeRequestId: { userId: staffUserId, changeRequestId },
    },
    create: {
      userId: staffUserId,
      changeRequestId,
      status: 'ASSIGNED',
      actedById: assignedById,
      actedAt: new Date(),
      isRead: false,
    },
    update: {
      status: 'ASSIGNED',
      actedById: assignedById,
      actedAt: new Date(),
      isRead: false,
    },
  });
}

export async function backfillApprovalNotifications() {
  const pendingCrs = await prisma.changeRequest.findMany({
    where: { status: 'PENDING_APPROVAL' },
    select: { id: true },
  });

  for (const cr of pendingCrs) {
    await notifyApproversNewCr(cr.id);
  }

  const acted = await prisma.changeRequest.findMany({
    where: { status: { in: ['APPROVED_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] } },
    select: { id: true, approverId: true, approvedAt: true },
  });

  for (const cr of acted) {
    await prisma.notification.updateMany({
      where: { changeRequestId: cr.id, status: 'PENDING_APPROVAL' },
      data: {
        status: 'APPROVED',
        actedById: cr.approverId,
        actedAt: cr.approvedAt,
      },
    });
  }

  const rejected = await prisma.changeRequest.findMany({
    where: { status: 'REJECTED' },
    select: { id: true, approverId: true, updatedAt: true },
  });

  for (const cr of rejected) {
    await prisma.notification.updateMany({
      where: { changeRequestId: cr.id, status: 'PENDING_APPROVAL' },
      data: {
        status: 'REJECTED',
        actedById: cr.approverId,
        actedAt: cr.updatedAt,
      },
    });
  }
}
