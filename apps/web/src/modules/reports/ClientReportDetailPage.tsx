import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Pie, Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import { apiFetch } from '@/shared/api/client';
import { CR_STATUS_COLORS, CR_STATUS_LABELS } from '@/shared/constants';
import type { ClientReportRow, CrReportRow } from '@/shared/types/reports';

interface OrganizationInfo {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string;
  contactEmail: string | null;
  contactPhone: string | null;
  primaryContactName: string | null;
  slaDays: number;
}

interface CrListResponse {
  changeRequests: CrReportRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function slaTag(status: string, slaDueAt?: string | null) {
  if (!slaDueAt || ['CLOSED', 'REJECTED', 'RESOLVED'].includes(status)) {
    return <Tag>—</Tag>;
  }
  const due = dayjs(slaDueAt);
  if (due.isBefore(dayjs())) return <Tag color="red">Breached</Tag>;
  if (due.diff(dayjs(), 'day') <= 3) return <Tag color="orange">At risk</Tag>;
  return <Tag color="green">On track</Tag>;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(CR_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function ClientReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ClientReportRow | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [reportLoading, setReportLoading] = useState(true);

  const [changeRequests, setChangeRequests] = useState<CrReportRow[]>([]);
  const [crLoading, setCrLoading] = useState(false);
  const [crTotal, setCrTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadReport = useCallback(() => {
    if (!id) return;
    setReportLoading(true);
    apiFetch<{ report: ClientReportRow; organization: OrganizationInfo }>(`/reports/organizations/${id}`)
      .then((r) => {
        setReport(r.report);
        setOrganization(r.organization);
      })
      .finally(() => setReportLoading(false));
  }, [id]);

  const loadChangeRequests = useCallback(() => {
    if (!id) return;
    setCrLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortField,
      sortOrder,
    });
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);

    apiFetch<CrListResponse>(`/reports/organizations/${id}/change-requests?${params}`)
      .then((r) => {
        setChangeRequests(r.changeRequests);
        setCrTotal(r.pagination.total);
      })
      .finally(() => setCrLoading(false));
  }, [id, page, pageSize, search, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadChangeRequests();
  }, [loadChangeRequests]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<CrReportRow> | SorterResult<CrReportRow>[],
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 10);
    if (s?.field) {
      setSortField(String(s.field));
      setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  if (reportLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report || !organization) {
    return (
      <div>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/reports')}
          style={{ paddingLeft: 0 }}
        >
          Back to reports
        </Button>
        <Typography.Text type="secondary">School report not found.</Typography.Text>
      </div>
    );
  }

  const statusPieData = (report.statusBreakdown ?? [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      type: CR_STATUS_LABELS[s.status] ?? s.status,
      value: s.count,
    }));

  const moduleColumnData = report.moduleBreakdown ?? [];

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/reports')}
        style={{ paddingLeft: 0 }}
      >
        Back to reports
      </Button>

      <Typography.Title level={3} style={{ marginTop: 8 }}>
        {organization.name}
      </Typography.Title>
      <Typography.Text type="secondary">
        {organization.city ? `${organization.city}, ` : ''}
        {organization.country} · Code: {organization.code} · SLA: {organization.slaDays} days
      </Typography.Text>

      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} style={{ marginTop: 16 }}>
        <Descriptions.Item label="Primary contact">
          {organization.primaryContactName ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Email">{organization.contactEmail ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Phone">{organization.contactPhone ?? '—'}</Descriptions.Item>
      </Descriptions>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Total CRs" value={report.total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Open" value={report.open} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Pending" value={report.pending} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="In progress" value={report.inProgress} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="SLA breached"
              value={report.slaBreached}
              valueStyle={{ color: report.slaBreached > 0 ? '#b91c1c' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Avg days to close"
              value={report.avgDaysToClose ?? '—'}
              suffix={report.avgDaysToClose != null ? ' days' : undefined}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="CRs by status">
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
              <Typography.Text type="secondary">No change requests</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="CRs by module">
            {moduleColumnData.length > 0 ? (
              <Column
                data={moduleColumnData}
                xField="module"
                yField="count"
                height={280}
                label={{ position: 'top' }}
                xAxis={{ label: { autoRotate: true } }}
              />
            ) : (
              <Typography.Text type="secondary">No change requests</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="Change requests"
        style={{ marginTop: 16 }}
        extra={
          <Space wrap>
            <Input
              allowClear
              placeholder="Search title, module…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: 220 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={STATUS_FILTER_OPTIONS}
              style={{ width: 180 }}
            />
          </Space>
        }
      >
        <Table<CrReportRow>
          rowKey="id"
          loading={crLoading}
          dataSource={changeRequests}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize,
            total: crTotal,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `${total} change requests`,
          }}
          columns={[
            {
              title: 'Title',
              dataIndex: 'title',
              ellipsis: true,
              sorter: true,
              sortOrder: sortField === 'title' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
              render: (title: string, row) => (
                <Link to={`/change-requests/${row.id}`} onClick={(e) => e.stopPropagation()}>
                  {title}
                </Link>
              ),
            },
            {
              title: 'Module',
              dataIndex: 'moduleAffected',
              sorter: true,
              sortOrder:
                sortField === 'moduleAffected' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              sorter: true,
              sortOrder: sortField === 'status' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
              render: (s: string) => (
                <Tag color={CR_STATUS_COLORS[s]}>{CR_STATUS_LABELS[s] ?? s}</Tag>
              ),
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              sorter: true,
              sortOrder: sortField === 'priority' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
            },
            {
              title: 'Raised by',
              render: (_: unknown, row) => row.requestedBy.fullName,
            },
            {
              title: 'Assigned',
              render: (_: unknown, row) => row.assignedStaff?.fullName ?? '—',
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              sorter: true,
              sortOrder: sortField === 'createdAt' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
              render: (d: string) => dayjs(d).format('DD MMM YYYY'),
            },
            {
              title: 'SLA',
              render: (_: unknown, row) => slaTag(row.status, row.slaDueAt),
            },
          ]}
        />
      </Card>
    </div>
  );
}
