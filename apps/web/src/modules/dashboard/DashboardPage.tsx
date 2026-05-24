import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { apiFetch } from '@/shared/api/client';
import { useAuth } from '@/shared/auth/AuthContext';
import { canViewReports, isClient, ROLE_LABELS } from '@/shared/auth/permissions';
import { AdminDashboard } from './AdminDashboard';
import { StaffDashboard } from './StaffDashboard';

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    apiFetch<{ summary: Record<string, number> }>('/dashboard/summary').then((r) => setSummary(r.summary));
  }, []);

  const isAdminView = canViewReports(user!.role);
  const isStaffView = user!.role === 'CS_MEMBER';

  const cards = isClient(user!.role)
    ? [
        { title: 'Pending approval', value: summary.pending ?? 0 },
        { title: 'In progress', value: summary.inProgress ?? 0 },
        { title: 'Resolved', value: summary.resolved ?? 0 },
        { title: 'Total requests', value: summary.total ?? 0 },
      ]
    : isStaffView
      ? []
      : [];

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Dashboard
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: isAdminView || isStaffView ? 16 : 24 }}>
        {ROLE_LABELS[user!.role]}
        {user!.organizationName ? ` — ${user!.organizationName}` : ' — Swipetouch operations'}
      </Typography.Paragraph>

      {isAdminView && <AdminDashboard summary={summary} role={user!.role} />}

      {isStaffView && <StaffDashboard />}

      {!isAdminView && !isStaffView && (
        <Row gutter={[16, 16]}>
          {cards.map((c) => (
            <Col xs={24} sm={12} lg={6} key={c.title}>
              <Card>
                <Statistic title={c.title} value={c.value} />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}