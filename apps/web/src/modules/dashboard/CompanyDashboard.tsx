import { useEffect, useState } from 'react';
import { Card, Col, Row, Segmented, Statistic, Tag, Typography } from 'antd';
import { Pie, Column } from '@ant-design/plots';
import { apiFetch } from '@/shared/api/client';

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

export function CompanyDashboard() {
  const [period, setPeriod] = useState<number>(1);
  const [data, setData] = useState<CompanyAnalytics | null>(null);

  useEffect(() => {
    apiFetch<CompanyAnalytics>(`/dashboard/company?period=${period}`).then(setData);
  }, [period]);

  if (!data) return null;

  const statusPieData = data.statusBreakdown
    .filter((s) => s.count > 0)
    .map((s) => ({ type: s.label, value: s.count }));

  const completedPie = data.pieCompleted.filter((p) => p.value > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Swipetouch operations overview
        </Typography.Title>
        <Segmented
          value={period}
          onChange={(v) => setPeriod(v as number)}
          options={[
            { label: '1 month', value: 1 },
            { label: '3 months', value: 3 },
            { label: '6 months', value: 6 },
          ]}
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={`CRs completed (${data.periodLabel})`} value={data.completedInPeriod} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={`CRs raised (${data.periodLabel})`} value={data.createdInPeriod} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="SLA compliance"
              value={data.sla.complianceRate}
              suffix="%"
              valueStyle={{ color: data.sla.maintainingSla ? '#047857' : '#b91c1c' }}
            />
            <Tag color={data.sla.maintainingSla ? 'green' : 'red'} style={{ marginTop: 8 }}>
              {data.sla.maintainingSla ? 'Maintaining SLA' : `${data.sla.breached} breach(es)`}
            </Tag>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Open CRs by status">
            {statusPieData.length > 0 ? (
              <Pie
                data={statusPieData}
                angleField="value"
                colorField="type"
                radius={0.85}
                innerRadius={0.5}
                label={{ type: 'outer', content: '{name}: {value}' }}
                height={280}
              />
            ) : (
              <Typography.Text type="secondary">No open change requests</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={`Completed vs raised (${data.periodLabel})`}>
            {completedPie.length > 0 ? (
              <Pie
                data={completedPie}
                angleField="value"
                colorField="type"
                radius={0.85}
                label={{ type: 'outer', content: '{name}: {value}' }}
                height={280}
              />
            ) : (
              <Typography.Text type="secondary">No activity in this period</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title={`Most CRs raised by client (${data.periodLabel})`}>
            {data.topClients.length > 0 ? (
              <Column
                data={data.topClients}
                xField="name"
                yField="count"
                height={260}
                label={{ position: 'top' }}
                xAxis={{ label: { autoRotate: true } }}
              />
            ) : (
              <Typography.Text type="secondary">No data</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="SLA health (open CRs)">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="On track" value={data.sla.onTrack} valueStyle={{ color: '#047857' }} />
              </Col>
              <Col span={8}>
                <Statistic title="At risk" value={data.sla.atRisk} valueStyle={{ color: '#b45309' }} />
              </Col>
              <Col span={8}>
                <Statistic title="Breached" value={data.sla.breached} valueStyle={{ color: '#b91c1c' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
