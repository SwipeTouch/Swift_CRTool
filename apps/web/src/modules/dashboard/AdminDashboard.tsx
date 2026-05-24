import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Segmented, Space, Statistic, Tag, Typography } from 'antd';
import { Column, Pie } from '@ant-design/plots';
import {
  BarChartOutlined,
  FileTextOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/shared/api/client';
import { ApprovalNotificationsPanel } from './ApprovalNotificationsPanel';
import { useNotifications } from '@/shared/hooks/useNotifications';
import type { AppRole } from '@/shared/auth/permissions';

interface CompanyAnalytics {
  periodMonths: number;
  periodLabel: string;
  completedInPeriod: number;
  createdInPeriod: number;
  statusBreakdown: { status: string; label: string; count: number }[];
  pieCompleted: { type: string; value: number }[];
  topClients: { name: string; count: number }[];
  sla: {
    onTrack: number;
    atRisk: number;
    breached: number;
    complianceRate: number;
    maintainingSla: boolean;
  };
}

interface Summary {
  pendingApproval?: number;
  active?: number;
  resolved?: number;
  closed?: number;
}

interface Props {
  summary: Summary;
  role: AppRole;
}

const CHART_H = 220;

export function AdminDashboard({ summary, role }: Props) {
  const [period, setPeriod] = useState(1);
  const [data, setData] = useState<CompanyAnalytics | null>(null);
  const { notifications, pendingCount, markRead, refresh } = useNotifications(role);

  useEffect(() => {
    apiFetch<CompanyAnalytics>(`/dashboard/company?period=${period}`).then(setData);
  }, [period]);

  const statusPieData =
    data?.statusBreakdown.filter((s) => s.count > 0).map((s) => ({ type: s.label, value: s.count })) ?? [];

  const topClients = data?.topClients.slice(0, 6) ?? [];

  return (
    <div className="crms-admin-dashboard">
      <div className="crms-dash-toolbar">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Operations overview
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Live snapshot — charts and pending queue
          </Typography.Text>
        </div>
        <Segmented
          value={period}
          onChange={(v) => setPeriod(v as number)}
          options={[
            { label: '1M', value: 1 },
            { label: '3M', value: 3 },
            { label: '6M', value: 6 },
          ]}
        />
      </div>

      <Row gutter={[12, 12]} className="crms-dash-kpis">
        <Col xs={12} sm={8} lg={4}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic title="Pending approval" value={summary.pendingApproval ?? 0} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic title="Active CRs" value={summary.active ?? 0} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic
              title={`Completed (${data?.periodLabel ?? '…'})`}
              value={data?.completedInPeriod ?? '—'}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic
              title={`Raised (${data?.periodLabel ?? '…'})`}
              value={data?.createdInPeriod ?? '—'}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic
              title="SLA compliance"
              value={data?.sla.complianceRate ?? '—'}
              suffix={data ? '%' : undefined}
              valueStyle={{
                fontSize: 22,
                color: data?.sla.maintainingSla ? '#047857' : '#b91c1c',
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="crms-dash-kpi" size="small">
            <Statistic
              title="SLA breached"
              value={data?.sla.breached ?? '—'}
              valueStyle={{ fontSize: 22, color: data && data.sla.breached > 0 ? '#b91c1c' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={8}>
          <Card className="crms-dash-card" title="Open CRs by status" size="small">
            {statusPieData.length > 0 ? (
              <Pie
                data={statusPieData}
                angleField="value"
                colorField="type"
                radius={0.9}
                innerRadius={0.55}
                legend={{ position: 'bottom' }}
                height={CHART_H}
              />
            ) : (
              <Typography.Text type="secondary">No open CRs</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            className="crms-dash-card"
            title={`Top clients (${data?.periodLabel ?? ''})`}
            size="small"
          >
            {topClients.length > 0 ? (
              <Column
                data={topClients}
                xField="name"
                yField="count"
                height={CHART_H}
                label={{ position: 'top', style: { fontSize: 10 } }}
                axis={{ x: { label: { autoRotate: true, style: { fontSize: 10 } } } }}
              />
            ) : (
              <Typography.Text type="secondary">No data</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <ApprovalNotificationsPanel
            notifications={notifications}
            pendingCount={pendingCount}
            onMarkRead={markRead}
            onRefresh={refresh}
            compact
            pendingOnly
            maxItems={5}
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={14}>
          <Card className="crms-dash-card" title="SLA health (open CRs)" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="On track" value={data?.sla.onTrack ?? 0} valueStyle={{ color: '#047857' }} />
              </Col>
              <Col span={8}>
                <Statistic title="At risk" value={data?.sla.atRisk ?? 0} valueStyle={{ color: '#b45309' }} />
              </Col>
              <Col span={8}>
                <Statistic title="Breached" value={data?.sla.breached ?? 0} valueStyle={{ color: '#b91c1c' }} />
              </Col>
            </Row>
            {data && (
              <Tag
                color={data.sla.maintainingSla ? 'green' : 'red'}
                style={{ marginTop: 12 }}
              >
                {data.sla.maintainingSla ? 'Maintaining SLA targets' : `${data.sla.breached} breach(es) need attention`}
              </Tag>
            )}
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className="crms-dash-card" title="Quick links" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Link to="/approvals">
                <Button block icon={<FileTextOutlined />}>
                  Pending approvals {pendingCount > 0 ? `(${pendingCount})` : ''}
                </Button>
              </Link>
              <Link to="/change-requests">
                <Button block icon={<FileTextOutlined />}>
                  All change requests <RightOutlined />
                </Button>
              </Link>
              <Link to="/reports">
                <Button block icon={<BarChartOutlined />}>
                  Full analytics & reports <RightOutlined />
                </Button>
              </Link>
              <Link to="/admin/organizations">
                <Button block icon={<TeamOutlined />}>
                  Institutions <RightOutlined />
                </Button>
              </Link>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
