import { Router } from 'express';
import type { ChangeRequestStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { isSlaAtRisk, isSlaBreached } from '../lib/sla.js';
import { requireAuth, requireRoles, type AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (req: AuthRequest, res) => {
  const role = req.role!;

  if (role === 'CLIENT') {
    const orgId = req.organizationId!;
    const [pending, inProgress, resolved, total] = await Promise.all([
      prisma.changeRequest.count({ where: { organizationId: orgId, status: 'PENDING_APPROVAL' } }),
      prisma.changeRequest.count({
        where: { organizationId: orgId, status: { in: ['APPROVED_ASSIGNED', 'IN_PROGRESS'] } },
      }),
      prisma.changeRequest.count({ where: { organizationId: orgId, status: 'RESOLVED' } }),
      prisma.changeRequest.count({ where: { organizationId: orgId } }),
    ]);
    res.json({ summary: { pending, inProgress, resolved, total } });
    return;
  }

  if (role === 'CS_MEMBER') {
    const staffId = req.userId!;
    const [assigned, inProgress, resolved, myCrs] = await Promise.all([
      prisma.changeRequest.count({ where: { assignedStaffId: staffId, status: 'APPROVED_ASSIGNED' } }),
      prisma.changeRequest.count({ where: { assignedStaffId: staffId, status: 'IN_PROGRESS' } }),
      prisma.changeRequest.count({ where: { assignedStaffId: staffId, status: 'RESOLVED' } }),
      prisma.changeRequest.findMany({
        where: { assignedStaffId: staffId, status: { in: ['APPROVED_ASSIGNED', 'IN_PROGRESS', 'RESOLVED'] } },
        select: { status: true, moduleAffected: true, priority: true, slaDueAt: true },
      }),
    ]);

    const byStatus = [
      { label: 'Awaiting start', count: assigned },
      { label: 'In progress', count: inProgress },
      { label: 'Resolved', count: resolved },
    ].filter((s) => s.count > 0);

    const moduleMap = new Map<string, number>();
    for (const cr of myCrs) {
      moduleMap.set(cr.moduleAffected, (moduleMap.get(cr.moduleAffected) ?? 0) + 1);
    }
    const byModule = [...moduleMap.entries()]
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const priorityMap = new Map<string, number>();
    for (const cr of myCrs) {
      priorityMap.set(cr.priority, (priorityMap.get(cr.priority) ?? 0) + 1);
    }
    const byPriority = [...priorityMap.entries()].map(([priority, count]) => ({ priority, count }));

  let slaAtRisk = 0;
  let slaBreached = 0;
  for (const cr of myCrs) {
    if (cr.slaDueAt && new Date() > cr.slaDueAt) slaBreached++;
    else if (cr.slaDueAt) {
      const daysLeft = (cr.slaDueAt.getTime() - Date.now()) / 86400000;
      if (daysLeft <= 3) slaAtRisk++;
    }
  }

    res.json({
      summary: { assigned, inProgress, resolved, total: myCrs.length },
      byStatus,
      byModule,
      byPriority,
      sla: { atRisk: slaAtRisk, breached: slaBreached },
    });
    return;
  }

  const [pendingApproval, active, resolved, rejected, closed] = await Promise.all([
    prisma.changeRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.changeRequest.count({ where: { status: { in: ['APPROVED_ASSIGNED', 'IN_PROGRESS'] } } }),
    prisma.changeRequest.count({ where: { status: 'RESOLVED' } }),
    prisma.changeRequest.count({ where: { status: 'REJECTED' } }),
    prisma.changeRequest.count({ where: { status: 'CLOSED' } }),
  ]);

  res.json({ summary: { pendingApproval, active, resolved, rejected, closed } });
});

dashboardRouter.get('/company', requireRoles('ADMIN', 'APPROVER'), async (req, res) => {
  const periodMonths = Math.min(6, Math.max(1, Number(req.query.period) || 1));
  const since = new Date();
  since.setMonth(since.getMonth() - periodMonths);

  const openStatuses: ChangeRequestStatus[] = [
    'PENDING_APPROVAL',
    'APPROVED_ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
  ];

  const [allOpen, completedInPeriod, createdInPeriod, byOrg] = await Promise.all([
    prisma.changeRequest.findMany({
      where: { status: { in: openStatuses } },
      select: { status: true, slaDueAt: true, organizationId: true },
    }),
    prisma.changeRequest.count({
      where: {
        status: { in: ['CLOSED', 'RESOLVED'] },
        OR: [{ closedAt: { gte: since } }, { resolvedAt: { gte: since } }],
      },
    }),
    prisma.changeRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.changeRequest.groupBy({
      by: ['organizationId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const notStarted = allOpen.filter((c) => c.status === 'APPROVED_ASSIGNED').length;
  const inProgress = allOpen.filter((c) => c.status === 'IN_PROGRESS').length;
  const pendingApproval = allOpen.filter((c) => c.status === 'PENDING_APPROVAL').length;
  const awaitingClose = allOpen.filter((c) => c.status === 'RESOLVED').length;

  let slaBreached = 0;
  let slaAtRisk = 0;
  let slaOnTrack = 0;

  for (const cr of allOpen) {
    if (isSlaBreached(cr.status, cr.slaDueAt)) slaBreached++;
    else if (isSlaAtRisk(cr.status, cr.slaDueAt)) slaAtRisk++;
    else slaOnTrack++;
  }

  const orgIds = byOrg.map((g) => g.organizationId);
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true, code: true },
  });
  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o]));

  const topClients = byOrg.map((g) => ({
    organizationId: g.organizationId,
    name: orgMap[g.organizationId]?.name ?? 'Unknown',
    code: orgMap[g.organizationId]?.code ?? '',
    count: g._count.id,
  }));

  const slaTotal = slaBreached + slaAtRisk + slaOnTrack;
  const complianceRate =
    slaTotal > 0 ? Math.round((slaOnTrack / slaTotal) * 1000) / 10 : 100;

  res.json({
    periodMonths,
    periodLabel: `${periodMonths} month${periodMonths > 1 ? 's' : ''}`,
    completedInPeriod,
    createdInPeriod,
    statusBreakdown: [
      { status: 'not_started', label: 'Not started', count: notStarted },
      { status: 'in_progress', label: 'In progress', count: inProgress },
      { status: 'pending_approval', label: 'Pending approval', count: pendingApproval },
      { status: 'awaiting_close', label: 'Resolved (awaiting close)', count: awaitingClose },
    ],
    pieCompleted: [
      { type: 'Completed in period', value: completedInPeriod },
      {
        type: 'Open / other',
        value: Math.max(0, createdInPeriod - completedInPeriod),
      },
    ],
    topClients,
    sla: {
      onTrack: slaOnTrack,
      atRisk: slaAtRisk,
      breached: slaBreached,
      complianceRate,
      maintainingSla: slaBreached === 0,
    },
  });
});
