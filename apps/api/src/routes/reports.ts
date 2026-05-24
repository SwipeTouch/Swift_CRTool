import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { isSlaAtRisk, isSlaBreached } from '../lib/sla.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRoles('ADMIN', 'APPROVER'));

function buildOrgStats(
  org: { id: string; name: string; code: string; city: string | null; slaDays: number },
  crs: {
    status: string;
    moduleAffected: string;
    priority: string;
    createdAt: Date;
    closedAt: Date | null;
    resolvedAt: Date | null;
    slaDueAt: Date | null;
  }[],
) {
  const closed = crs.filter((c) => c.closedAt || c.status === 'CLOSED');
  const durations = closed
    .map((c) => {
      const end = c.closedAt ?? c.resolvedAt;
      if (!end) return null;
      return (end.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((d): d is number => d !== null);

  const avgDaysToClose =
    durations.length > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;

  const moduleCounts: Record<string, number> = {};
  for (const c of crs) {
    moduleCounts[c.moduleAffected] = (moduleCounts[c.moduleAffected] ?? 0) + 1;
  }
  const topModules = Object.entries(moduleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([module, count]) => ({ module, count }));

  const openCrs = crs.filter((c) => !['CLOSED', 'REJECTED'].includes(c.status));
  let slaBreached = 0;
  let slaAtRisk = 0;
  for (const c of openCrs) {
    if (isSlaBreached(c.status as 'IN_PROGRESS', c.slaDueAt)) slaBreached++;
    else if (isSlaAtRisk(c.status as 'IN_PROGRESS', c.slaDueAt)) slaAtRisk++;
  }

  const slaComplianceRate =
    openCrs.length > 0
      ? Math.round(((openCrs.length - slaBreached) / openCrs.length) * 1000) / 10
      : 100;

  return {
    organization: {
      id: org.id,
      name: org.name,
      code: org.code,
      city: org.city,
      slaDays: org.slaDays,
    },
    total: crs.length,
    pending: crs.filter((c) => c.status === 'PENDING_APPROVAL').length,
    inProgress: crs.filter((c) => ['APPROVED_ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length,
    resolved: crs.filter((c) => c.status === 'RESOLVED').length,
    open: openCrs.length,
    closed: closed.length,
    rejected: crs.filter((c) => c.status === 'REJECTED').length,
    avgDaysToClose,
    delayedOver14Days: crs.filter(
      (c) =>
        !['CLOSED', 'REJECTED', 'RESOLVED'].includes(c.status) &&
        Date.now() - c.createdAt.getTime() > 14 * 24 * 60 * 60 * 1000,
    ).length,
    slaBreached,
    slaAtRisk,
    slaComplianceRate,
    topModules,
    moduleBreakdown: Object.entries(moduleCounts).map(([module, count]) => ({ module, count })),
    statusBreakdown: [
      { status: 'PENDING_APPROVAL', count: crs.filter((c) => c.status === 'PENDING_APPROVAL').length },
      { status: 'IN_PROGRESS', count: crs.filter((c) => ['APPROVED_ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length },
      { status: 'RESOLVED', count: crs.filter((c) => c.status === 'RESOLVED').length },
      { status: 'CLOSED', count: crs.filter((c) => c.status === 'CLOSED').length },
      { status: 'REJECTED', count: crs.filter((c) => c.status === 'REJECTED').length },
    ].filter((s) => s.count > 0),
  };
}

reportsRouter.get('/summary', async (_req, res) => {
  const orgs = await prisma.organization.findMany({ where: { status: 'active' } });
  const crs = await prisma.changeRequest.findMany({
    select: {
      status: true,
      moduleAffected: true,
      createdAt: true,
      closedAt: true,
      resolvedAt: true,
      slaDueAt: true,
      organizationId: true,
    },
  });

  const openCrs = crs.filter((c) => !['CLOSED', 'REJECTED'].includes(c.status));
  let slaBreached = 0;
  for (const c of openCrs) {
    if (isSlaBreached(c.status as 'IN_PROGRESS', c.slaDueAt)) slaBreached++;
  }

  const closed = crs.filter((c) => c.closedAt || c.status === 'CLOSED');
  const durations = closed
    .map((c) => {
      const end = c.closedAt ?? c.resolvedAt;
      if (!end) return null;
      return (end.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((d): d is number => d !== null);

  const moduleGrouped = await prisma.changeRequest.groupBy({
    by: ['moduleAffected'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const byOrg: Record<string, number> = {};
  for (const c of crs) {
    byOrg[c.organizationId] = (byOrg[c.organizationId] ?? 0) + 1;
  }

  res.json({
    summary: {
      activeSchools: orgs.length,
      totalCrs: crs.length,
      openCrs: openCrs.length,
      closedCrs: closed.length,
      pendingApproval: crs.filter((c) => c.status === 'PENDING_APPROVAL').length,
      inProgress: crs.filter((c) => ['APPROVED_ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length,
      rejected: crs.filter((c) => c.status === 'REJECTED').length,
      slaBreached,
      avgDaysToClose:
        durations.length > 0
          ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
          : null,
      slaComplianceRate:
        openCrs.length > 0
          ? Math.round(((openCrs.length - slaBreached) / openCrs.length) * 1000) / 10
          : 100,
    },
    charts: {
      statusDistribution: [
        { status: 'Pending approval', count: crs.filter((c) => c.status === 'PENDING_APPROVAL').length },
        { status: 'Not started', count: crs.filter((c) => c.status === 'APPROVED_ASSIGNED').length },
        { status: 'In progress', count: crs.filter((c) => c.status === 'IN_PROGRESS').length },
        { status: 'Resolved', count: crs.filter((c) => c.status === 'RESOLVED').length },
        { status: 'Closed', count: crs.filter((c) => c.status === 'CLOSED').length },
        { status: 'Rejected', count: crs.filter((c) => c.status === 'REJECTED').length },
      ].filter((s) => s.count > 0),
      crsBySchool: orgs
        .map((o) => ({ name: o.name, count: byOrg[o.id] ?? 0 }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count),
      topModules: moduleGrouped.map((g) => ({ module: g.moduleAffected, count: g._count.id })),
    },
  });
});

reportsRouter.get('/overview', async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, code: true, city: true, slaDays: true },
    orderBy: { name: 'asc' },
  });

  const stats = await Promise.all(
    orgs.map(async (org) => {
      const crs = await prisma.changeRequest.findMany({
        where: { organizationId: org.id },
        select: {
          status: true,
          moduleAffected: true,
          priority: true,
          createdAt: true,
          closedAt: true,
          resolvedAt: true,
          slaDueAt: true,
        },
      });
      return buildOrgStats(org, crs);
    }),
  );

  res.json({ clientReports: stats });
});

reportsRouter.get('/organizations/:id', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      country: true,
      contactEmail: true,
      contactPhone: true,
      primaryContactName: true,
      slaDays: true,
    },
  });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const crs = await prisma.changeRequest.findMany({
    where: { organizationId: org.id },
    select: {
      status: true,
      moduleAffected: true,
      priority: true,
      createdAt: true,
      closedAt: true,
      resolvedAt: true,
      slaDueAt: true,
    },
  });

  res.json({ report: buildOrgStats(org, crs), organization: org });
});

reportsRouter.get('/organizations/:id/change-requests', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
  const search = (req.query.search as string | undefined)?.trim();
  const status = req.query.status as string | undefined;
  const sortField = (req.query.sortField as string) || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  const where: Prisma.ChangeRequestWhereInput = {
    organizationId: req.params.id,
    ...(status && { status: status as Prisma.EnumChangeRequestStatusFilter }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { moduleAffected: { contains: search } },
        { description: { contains: search } },
      ],
    }),
  };

  const orderBy: Prisma.ChangeRequestOrderByWithRelationInput =
    sortField === 'title'
      ? { title: sortOrder }
      : sortField === 'status'
        ? { status: sortOrder }
        : sortField === 'moduleAffected'
          ? { moduleAffected: sortOrder }
          : sortField === 'priority'
            ? { priority: sortOrder }
            : { createdAt: sortOrder };

  const [total, items] = await Promise.all([
    prisma.changeRequest.count({ where }),
    prisma.changeRequest.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        requestedBy: { select: { fullName: true, email: true } },
        assignedStaff: { select: { fullName: true } },
      },
    }),
  ]);

  res.json({
    changeRequests: items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

reportsRouter.get('/modules', async (_req, res) => {
  const grouped = await prisma.changeRequest.groupBy({
    by: ['moduleAffected'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 15,
  });

  res.json({
    modules: grouped.map((g) => ({ module: g.moduleAffected, count: g._count.id })),
  });
});
