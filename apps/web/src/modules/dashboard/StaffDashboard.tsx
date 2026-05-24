import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { Column, Pie } from '@ant-design/plots';
import { FileTextOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/shared/api/client';
import { StaffNotificationsPanel } from './StaffNotificationsPanel';

interface StaffDashboardData {
  summary: { assigned: number; inProgress: number; resolved: number; total: number };
  byStatus: { label: string; count: number }[];
  byModule: { module: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  sla: { atRisk: number; breached: number };
}

const CHART_H = 200;

export function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardData | null>(null);

  useEffect(() => {
    apiFetch<StaffDashboardData>('/dashboard/summary').then(setData);
  }, []);

  const statusPie =
    data?.byStatus.map((s) => ({ type: s.label, value: s.count })) ?? [];
  const moduleData = data?.byModule ?? [];
  const priorityData = data?.byPriority.map((p) => ({ type: p.priority, value: p.count })) ?? [];

  return (
    <div className="crms-staff-dashboard">
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic title="Awaiting start" value={data?.summary.assigned ?? 0} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic title="In progress" value={data?.summary.inProgress ?? 0} valueStyle={{ fontSize: 22, color: '#0369a1' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic title="Resolved" value={data?.summary.resolved ?? 0} valueStyle={{ fontSize: 22, color: '#047857' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic
              title="SLA at risk / breached"
              value={`${data?.sla.atRisk ?? 0} / ${data?.sla.breached ?? 0}`}
              valueStyle={{ fontSize: 18, color: data && data.sla.breached > 0 ? '#b91c1c' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={8}>
          <Card className="crms-dash-card" title="My queue by status" size="small">
            {statusPie.length > 0 ? (
              <Pie data={statusPie} angleField="value" colorField="type" radius={0.9} innerRadius={0.55} legend={{ position: 'bottom' }} height={CHART_H} />
            ) : (
              <Typography.Text type="secondary">No active tickets</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="crms-dash-card" title="By module" size="small">
            {moduleData.length > 0 ? (
              <Column data={moduleData} xField="module" yField="count" height={CHART_H} label={{ position: 'top', style: { fontSize: 10 } }} />
            ) : (
              <Typography.Text type="secondary">No data</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="crms-dash-card" title="By priority" size="small">
            {priorityData.length > 0 ? (
              <Column data={priorityData} xField="type" yField="value" height={CHART_H} colorField="type" legend={false} />
            ) : (
              <Typography.Text type="secondary">No data</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={14}>
          <StaffNotificationsPanel />
        </Col>
        <Col xs={24} lg={10}>
          <Card className="crms-dash-card" title="Quick links" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Link to="/change-requests?assignedToMe=true">
                <Button block icon={<FileTextOutlined />}>
                  My assigned tickets <RightOutlined />
                </Button>
              </Link>
              <Link to="/change-requests">
                <Button block icon={<FileTextOutlined />}>
                  All available tickets <RightOutlined />
                </Button>
              </Link>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
