import { Router } from 'express';
import type { ChangeRequestStatus, CommentVisibility, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logWorkflow } from '../lib/audit.js';
import { notifyApproversNewCr, notifyAdminsCrReturned, notifyStaffAssigned, resolveApproverNotifications, resolveReturnedNotifications } from '../lib/notifications.js';
import { computeSlaDueAt } from '../lib/sla.js';
import { canReassign, canReturnToAdmin, canTransition, rolesAllowedForStatus } from '../lib/workflow.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const changeRequestsRouter = Router();

changeRequestsRouter.use(requireAuth);

const crInclude = {
  organization: { select: { id: true, name: true, code: true } },
  requestedBy: { select: { id: true, fullName: true, email: true } },
  approver: { select: { id: true, fullName: true, email: true } },
  assignedStaff: { select: { id: true, fullName: true, email: true } },
  _count: { select: { comments: true, externalTickets: true } },
} satisfies Prisma.ChangeRequestInclude;

function clientVisibleWhere(orgId: string): Prisma.ChangeRequestWhereInput {
  return { organizationId: orgId };
}

changeRequestsRouter.get('/', async (req: AuthRequest, res) => {
  const status = req.query.status as ChangeRequestStatus | undefined;
  const organizationId = req.query.organizationId as string | undefined;
  const assignedToMe = req.query.assignedToMe === 'true';
  const pendingApproval = req.query.pendingApproval === 'true';
  const search = (req.query.search as string | undefined)?.trim().toLowerCase();
  const sortBy = (req.query.sortBy as string | undefined) || 'updatedAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  let where: Prisma.ChangeRequestWhereInput = {};

  if (req.role === 'CLIENT') {
    where = clientVisibleWhere(req.organizationId!);
  } else if (req.role === 'CS_MEMBER') {
    where = assignedToMe
      ? { assignedStaffId: req.userId }
      : { OR: [{ assignedStaffId: req.userId }, { assignedStaffId: null, status: 'APPROVED_ASSIGNED' }] };
  } else if (req.role === 'APPROVER') {
    where = pendingApproval
      ? { status: 'PENDING_APPROVAL' }
      : {};
  }

  if (status) where = { ...where, status };
  if (organizationId && req.role !== 'CLIENT') where = { ...where, organizationId };

  if (search) {
    where = {
      AND: [
        where,
        {
          OR: [
            { title: { contains: search } },
            { moduleAffected: { contains: search } },
            { organization: { name: { contains: search } } },
          ],
        },
      ],
    };
  }

  const sortFieldMap: Record<string, Prisma.ChangeRequestOrderByWithRelationInput> = {
    title: { title: sortOrder },
    status: { status: sortOrder },
    priority: { priority: sortOrder },
    moduleAffected: { moduleAffected: sortOrder },
    updatedAt: { updatedAt: sortOrder },
    createdAt: { createdAt: sortOrder },
    organization: { organization: { name: sortOrder } },
  };

  const orderBy = sortFieldMap[sortBy] ?? { updatedAt: 'desc' };

  const items = await prisma.changeRequest.findMany({
    where,
    orderBy,
    include: crInclude,
  });

  res.json({ changeRequests: items });
});

changeRequestsRouter.get('/:id', async (req: AuthRequest, res) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: req.params.id },
    include: {
      ...crInclude,
      workflowLogs: {
        orderBy: { loggedAt: 'asc' },
        include: { triggeredBy: { select: { id: true, fullName: true, role: true } } },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, fullName: true, role: true } } },
      },
      externalTickets: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!cr) {
    res.status(404).json({ error: 'Change request not found' });
    return;
  }

  if (req.role === 'CLIENT' && cr.organizationId !== req.organizationId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (req.role === 'CS_MEMBER' && cr.assignedStaffId && cr.assignedStaffId !== req.userId) {
    const allowed = ['APPROVED_ASSIGNED', 'PENDING_APPROVAL'].includes(cr.status);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }

  const comments =
    req.role === 'CLIENT'
      ? cr.comments.filter((c) => c.visibility === 'CLIENT_VISIBLE')
      : cr.comments;

  res.json({ changeRequest: { ...cr, comments } });
});

changeRequestsRouter.post('/', async (req: AuthRequest, res) => {
  if (req.role !== 'CLIENT') {
    res.status(403).json({ error: 'Only client users can submit change requests' });
    return;
  }

  const { title, description, moduleAffected, priority } = req.body as {
    title?: string;
    description?: string;
    moduleAffected?: string;
    priority?: string;
  };

  if (!title?.trim() || !description?.trim() || !moduleAffected?.trim()) {
    res.status(400).json({ error: 'title, description, and moduleAffected are required' });
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id: req.organizationId! },
    include: { defaultApprover: true },
  });

  if (!org || org.status !== 'active') {
    res.status(400).json({ error: 'Organization is not active' });
    return;
  }

  const raiser = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!raiser?.isDesignatedRaiser) {
    res.status(403).json({ error: 'Only designated institution administrators can raise change requests' });
    return;
  }

  const now = new Date();
  const cr = await prisma.changeRequest.create({
    data: {
      organizationId: org.id,
      requestedById: req.userId!,
      approverId: org.defaultApproverId,
      title: title.trim(),
      description: description.trim(),
      moduleAffected: moduleAffected.trim(),
      priority: (priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
      slaDueAt: computeSlaDueAt(now, org.slaDays),
    },
    include: crInclude,
  });

  await logWorkflow({
    changeRequestId: cr.id,
    triggeredById: req.userId!,
    previousStatus: null,
    newStatus: 'PENDING_APPROVAL',
    actionNote: 'Change request submitted',
  });

  await notifyApproversNewCr(cr.id);

  res.status(201).json({ changeRequest: cr });
});

changeRequestsRouter.post('/:id/transition', async (req: AuthRequest, res) => {
  const { status: newStatus, note, assignedStaffId } = req.body as {
    status?: ChangeRequestStatus;
    note?: string;
    assignedStaffId?: string;
  };

  if (!newStatus) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  if (!rolesAllowedForStatus(newStatus).includes(req.role!)) {
    res.status(403).json({ error: 'Role cannot perform this transition' });
    return;
  }

  const cr = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!cr) {
    res.status(404).json({ error: 'Change request not found' });
    return;
  }

  if (!canTransition(cr.status, newStatus)) {
    res.status(400).json({ error: `Cannot transition from ${cr.status} to ${newStatus}` });
    return;
  }

  if (newStatus === 'APPROVED_ASSIGNED' && !assignedStaffId) {
    res.status(400).json({ error: 'assignedStaffId is required when approving' });
    return;
  }

  if (assignedStaffId) {
    const staff = await prisma.user.findFirst({
      where: { id: assignedStaffId, role: 'CS_MEMBER', isActive: true },
    });
    if (!staff) {
      res.status(400).json({ error: 'Invalid staff member' });
      return;
    }
  }

  const now = new Date();
  const updated = await prisma.changeRequest.update({
    where: { id: cr.id },
    data: {
      status: newStatus,
      approverId: newStatus === 'APPROVED_ASSIGNED' || newStatus === 'REJECTED' ? req.userId : cr.approverId,
      assignedStaffId:
        newStatus === 'APPROVED_ASSIGNED' ? (assignedStaffId ?? cr.assignedStaffId) : cr.assignedStaffId,
      rejectionReason: newStatus === 'REJECTED' ? note ?? 'Rejected' : cr.rejectionReason,
      approvedAt: newStatus === 'APPROVED_ASSIGNED' ? now : cr.approvedAt,
      assignedAt:
        newStatus === 'APPROVED_ASSIGNED' && (assignedStaffId || cr.assignedStaffId) ? now : cr.assignedAt,
      resolvedAt: newStatus === 'RESOLVED' ? now : cr.resolvedAt,
      closedAt: newStatus === 'CLOSED' ? now : cr.closedAt,
    },
    include: crInclude,
  });

  await logWorkflow({
    changeRequestId: cr.id,
    triggeredById: req.userId!,
    previousStatus: cr.status,
    newStatus,
    actionNote: note,
  });

  if (newStatus === 'APPROVED_ASSIGNED') {
    await resolveApproverNotifications(cr.id, 'APPROVED', req.userId!);
    const assigneeId = assignedStaffId ?? cr.assignedStaffId;
    if (assigneeId) {
      await notifyStaffAssigned(cr.id, assigneeId, req.userId!);
    }
  } else if (newStatus === 'REJECTED') {
    await resolveApproverNotifications(cr.id, 'REJECTED', req.userId!);
  }

  res.json({ changeRequest: updated });
});

changeRequestsRouter.post('/:id/return-to-admin', async (req: AuthRequest, res) => {
  if (req.role !== 'CS_MEMBER') {
    res.status(403).json({ error: 'Only staff can return tickets to admin' });
    return;
  }

  const { note } = req.body as { note?: string };
  if (!note?.trim()) {
    res.status(400).json({ error: 'note is required when returning a ticket' });
    return;
  }

  const cr = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!cr) {
    res.status(404).json({ error: 'Change request not found' });
    return;
  }

  if (cr.assignedStaffId !== req.userId) {
    res.status(403).json({ error: 'You can only return tickets assigned to you' });
    return;
  }

  if (!canReturnToAdmin(cr.status)) {
    res.status(400).json({ error: `Cannot return ticket in status ${cr.status}` });
    return;
  }

  const previousStatus = cr.status;
  const updated = await prisma.changeRequest.update({
    where: { id: cr.id },
    data: {
      status: 'APPROVED_ASSIGNED',
      assignedStaffId: null,
    },
    include: crInclude,
  });

  await logWorkflow({
    changeRequestId: cr.id,
    triggeredById: req.userId!,
    previousStatus,
    newStatus: 'APPROVED_ASSIGNED',
    actionNote: `Returned to admin for reassignment: ${note.trim()}`,
  });

  await notifyAdminsCrReturned(cr.id, req.userId!, note.trim());

  res.json({ changeRequest: updated });
});

changeRequestsRouter.post('/:id/reassign', async (req: AuthRequest, res) => {
  if (!['ADMIN', 'APPROVER'].includes(req.role!)) {
    res.status(403).json({ error: 'Only admin or approver can reassign tickets' });
    return;
  }

  const { assignedStaffId, note } = req.body as { assignedStaffId?: string; note?: string };
  if (!assignedStaffId) {
    res.status(400).json({ error: 'assignedStaffId is required' });
    return;
  }

  const staff = await prisma.user.findFirst({
    where: { id: assignedStaffId, role: 'CS_MEMBER', isActive: true },
  });
  if (!staff) {
    res.status(400).json({ error: 'Invalid staff member' });
    return;
  }

  const cr = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!cr) {
    res.status(404).json({ error: 'Change request not found' });
    return;
  }

  if (!canReassign(cr.status)) {
    res.status(400).json({ error: `Cannot reassign ticket in status ${cr.status}` });
    return;
  }

  const now = new Date();
  const updated = await prisma.changeRequest.update({
    where: { id: cr.id },
    data: {
      assignedStaffId,
      assignedAt: now,
      status: 'APPROVED_ASSIGNED',
    },
    include: crInclude,
  });

  await logWorkflow({
    changeRequestId: cr.id,
    triggeredById: req.userId!,
    previousStatus: cr.status,
    newStatus: 'APPROVED_ASSIGNED',
    actionNote: note?.trim()
      ? `Reassigned to ${staff.fullName}: ${note.trim()}`
      : `Reassigned to ${staff.fullName}`,
  });

  await resolveReturnedNotifications(cr.id, req.userId!);
  await notifyStaffAssigned(cr.id, assignedStaffId, req.userId!);

  res.json({ changeRequest: updated });
});

changeRequestsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const { content, visibility } = req.body as { content?: string; visibility?: CommentVisibility };

  if (!content?.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const cr = await prisma.changeRequest.findUnique({ where: { id: req.params.id } });
  if (!cr) {
    res.status(404).json({ error: 'Change request not found' });
    return;
  }

  if (req.role === 'CLIENT') {
    if (cr.organizationId !== req.organizationId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.status(403).json({ error: 'Clients cannot add comments; contact support via new CR' });
    return;
  }

  const vis: CommentVisibility =
    req.role === 'CS_MEMBER' || req.role === 'APPROVER' || req.role === 'ADMIN'
      ? visibility === 'CLIENT_VISIBLE'
        ? 'CLIENT_VISIBLE'
        : 'INTERNAL'
      : 'INTERNAL';

  const comment = await prisma.crComment.create({
    data: {
      changeRequestId: cr.id,
      authorId: req.userId!,
      content: content.trim(),
      visibility: vis,
    },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  res.status(201).json({ comment });
});

changeRequestsRouter.post('/:id/external-tickets', async (req: AuthRequest, res) => {
  if (!['CS_MEMBER', 'ADMIN', 'APPROVER'].includes(req.role!)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { system, externalId, url } = req.body as {
    system?: 'JIRA' | 'OSTICKET' | 'OTHER';
    externalId?: string;
    url?: string;
  };

  if (!system || !externalId?.trim()) {
    res.status(400).json({ error: 'system and externalId are required' });
    return;
  }

  const link = await prisma.externalTicketLink.create({
    data: {
      changeRequestId: req.params.id,
      system,
      externalId: externalId.trim(),
      url: url?.trim() || null,
      linkedById: req.userId!,
    },
  });

  res.status(201).json({ externalTicket: link });
});
