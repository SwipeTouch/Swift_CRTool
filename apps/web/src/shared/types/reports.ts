export interface ClientReportRow {
  organization: {
    id: string;
    name: string;
    code: string;
    city: string | null;
    slaDays: number;
  };
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  open: number;
  closed: number;
  rejected: number;
  avgDaysToClose: number | null;
  delayedOver14Days: number;
  slaBreached: number;
  slaAtRisk: number;
  slaComplianceRate: number;
  topModules: { module: string; count: number }[];
  statusBreakdown?: { status: string; count: number }[];
  moduleBreakdown?: { module: string; count: number }[];
}

export interface ReportsSummary {
  summary: {
    activeSchools: number;
    totalCrs: number;
    openCrs: number;
    closedCrs: number;
    pendingApproval: number;
    inProgress: number;
    rejected: number;
    slaBreached: number;
    avgDaysToClose: number | null;
    slaComplianceRate: number;
  };
  charts: {
    statusDistribution: { status: string; count: number }[];
    crsBySchool: { name: string; count: number }[];
    topModules: { module: string; count: number }[];
  };
}

export interface CrReportRow {
  id: string;
  title: string;
  status: string;
  moduleAffected: string;
  priority: string;
  createdAt: string;
  slaDueAt?: string | null;
  closedAt?: string | null;
  requestedBy: { fullName: string; email: string };
  assignedStaff?: { fullName: string } | null;
}
