import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Input, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import { Column, Pie } from '@ant-design/plots';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api/client';
import type { ClientReportRow, ReportsSummary } from '@/shared/types/reports';

export function ReportsPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [clientReports, setClientReports] = useState<ClientReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `${total} schools`,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<ReportsSummary>('/reports/summary'),
      apiFetch<{ clientReports: ClientReportRow[] }>('/reports/overview'),
    ])
      .then(([summaryData, overviewData]) => {
        setSummary(summaryData);
        setClientReports(overviewData.clientReports);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientReports;
    return clientReports.filter((row) => {
      const { name, code, city } = row.organization;
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        (city?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clientReports, search]);

  const columns: TableColumnsType<ClientReportRow> = [
    {
      title: 'School / College',
      key: 'school',
      sorter: (a, b) => a.organization.name.localeCompare(b.organization.name),
      render: (_, row) => (
        <div>
          <Typography.Text strong>{row.organization.name}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{row.organization.code}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'City',
      key: 'city',
      width: 120,
      sorter: (a, b) => (a.organization.city ?? '').localeCompare(b.organization.city ?? ''),
      render: (_, row) => row.organization.city ?? '—',
    },
    {
      title: 'Total CRs',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: 'Pending',
      dataIndex: 'pending',
      key: 'pending',
      width: 100,
      sorter: (a, b) => a.pending - b.pending,
      render: (value: number) =>
        value > 0 ? <Tag color="gold">{value}</Tag> : value,
    },
    {
      title: 'In progress',
      dataIndex: 'inProgress',
      key: 'inProgress',
      width: 110,
      sorter: (a, b) => a.inProgress - b.inProgress,
    },
    {
      title: 'Closed',
      dataIndex: 'closed',
      key: 'closed',
      width: 90,
      sorter: (a, b) => a.closed - b.closed,
    },
    {
      title: 'Rejected',
      dataIndex: 'rejected',
      key: 'rejected',
      width: 100,
      sorter: (a, b) => a.rejected - b.rejected,
    },
    {
      title: 'Avg close days',
      key: 'avgDaysToClose',
      width: 130,
      sorter: (a, b) => (a.avgDaysToClose ?? -1) - (b.avgDaysToClose ?? -1),
      render: (_, row) => (row.avgDaysToClose != null ? row.avgDaysToClose : '—'),
    },
    {
      title: 'SLA breaches',
      dataIndex: 'slaBreached',
      key: 'slaBreached',
      width: 120,
      sorter: (a, b) => a.slaBreached - b.slaBreached,
      render: (value: number) => (
        <Tag color={value > 0 ? 'red' : 'green'}>{value}</Tag>
      ),
    },
    {
      title: 'SLA %',
      dataIndex: 'slaComplianceRate',
      key: 'slaComplianceRate',
      width: 90,
      sorter: (a, b) => a.slaComplianceRate - b.slaComplianceRate,
      render: (value: number) => `${value}%`,
    },
    {
      title: 'Top module',
      key: 'topModule',
      ellipsis: true,
      render: (_, row) => row.topModules[0]?.module ?? '—',
    },
  ];

  const handleTableChange = (next: TablePaginationConfig) => {
    setPagination((prev) => ({
      ...prev,
      current: next.current,
      pageSize: next.pageSize,
    }));
  };

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Analytics & reporting
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Cross-school change request metrics, SLA compliance, and per-client breakdowns.
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title="Active schools" value={summary?.summary.activeSchools ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title="Total CRs" value={summary?.summary.totalCrs ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title="Open CRs" value={summary?.summary.openCrs ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title="Pending approval" value={summary?.summary.pendingApproval ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic
              title="Avg days to close"
              value={summary?.summary.avgDaysToClose ?? '—'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic
              title="SLA compliance"
              value={summary?.summary.slaComplianceRate ?? 0}
              suffix="%"
              valueStyle={{
                color:
                  (summary?.summary.slaComplianceRate ?? 100) >= 90 ? '#047857' : '#b91c1c',
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="CRs by status" loading={loading}>
            {summary && summary.charts.statusDistribution.length > 0 ? (
              <Pie
                data={summary.charts.statusDistribution}
                angleField="count"
                colorField="status"
                radius={0.85}
                innerRadius={0.5}
                label={{ type: 'outer', content: '{name}: {value}' }}
                height={280}
              />
            ) : (
              <Typography.Text type="secondary">No change requests yet</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="CRs by school" loading={loading}>
            {summary && summary.charts.crsBySchool.length > 0 ? (
              <Column
                data={summary.charts.crsBySchool}
                xField="name"
                yField="count"
                height={280}
                label={{ position: 'top' }}
                xAxis={{ label: { autoRotate: true } }}
              />
            ) : (
              <Typography.Text type="secondary">No data</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Top modules" loading={loading}>
            {summary && summary.charts.topModules.length > 0 ? (
              <Column
                data={summary.charts.topModules}
                xField="module"
                yField="count"
                height={280}
                label={{ position: 'top' }}
                xAxis={{ label: { autoRotate: true } }}
              />
            ) : (
              <Typography.Text type="secondary">No data</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="Per school summary"
        style={{ marginTop: 16 }}
        extra={
          <Input
            allowClear
            placeholder="Search by name, code, or city"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ width: 280 }}
          />
        }
      >
        <Table<ClientReportRow>
          rowKey={(row) => row.organization.id}
          loading={loading}
          columns={columns}
          dataSource={filteredReports}
          pagination={{
            ...pagination,
            total: filteredReports.length,
          }}
          onChange={handleTableChange}
          onRow={(row) => ({
            onClick: () => navigate(`/reports/schools/${row.organization.id}`),
            style: { cursor: 'pointer' },
          })}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}
