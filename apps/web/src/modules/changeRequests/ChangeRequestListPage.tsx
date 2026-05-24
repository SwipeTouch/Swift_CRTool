import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiFetch } from '@/shared/api/client';
import { useAuth } from '@/shared/auth/AuthContext';
import { isClient } from '@/shared/auth/permissions';
import { CR_STATUS_COLORS, CR_STATUS_LABELS } from '@/shared/constants';
import { exportRowsToXls } from '@/shared/utils/exportXls';

interface CrRow {
  id: string;
  title: string;
  moduleAffected: string;
  status: string;
  priority: string;
  updatedAt: string;
  createdAt: string;
  organization?: { name: string };
  assignedStaff?: { fullName: string } | null;
}

type SortField = 'title' | 'status' | 'priority' | 'moduleAffected' | 'updatedAt' | 'createdAt' | 'organization';

export function ChangeRequestListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignedToMe = searchParams.get('assignedToMe') === 'true';

  const [rows, setRows] = useState<CrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (assignedToMe) params.set('assignedToMe', 'true');
    params.set('sortBy', sortField);
    params.set('sortOrder', sortOrder);

    apiFetch<{ changeRequests: CrRow[] }>(`/change-requests?${params}`)
      .then((r) => setRows(r.changeRequests))
      .finally(() => setLoading(false));
  }, [search, statusFilter, sortField, sortOrder, assignedToMe]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const columns = useMemo(
    () => [
      { title: 'Title', dataIndex: 'title', ellipsis: true, sorter: true },
      ...(!isClient(user!.role)
        ? [{ title: 'Client', dataIndex: ['organization', 'name'], ellipsis: true, sorter: true }]
        : []),
      ...(!isClient(user!.role)
        ? [
            {
              title: 'Assignee',
              render: (_: unknown, r: CrRow) =>
                r.assignedStaff?.fullName ?? (r.status === 'APPROVED_ASSIGNED' ? 'Unassigned' : '—'),
              width: 130,
            },
          ]
        : []),
      { title: 'Module', dataIndex: 'moduleAffected', width: 120, sorter: true },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 170,
        sorter: true,
        render: (s: string, r: CrRow) => (
          <Tag color={CR_STATUS_COLORS[s]}>
            {CR_STATUS_LABELS[s] ?? s}
            {s === 'APPROVED_ASSIGNED' && !r.assignedStaff ? ' (pool)' : ''}
          </Tag>
        ),
      },
      { title: 'Priority', dataIndex: 'priority', width: 100, sorter: true },
      {
        title: 'Updated',
        dataIndex: 'updatedAt',
        width: 130,
        sorter: true,
        render: (v: string) => dayjs(v).format('DD MMM YYYY'),
      },
    ],
    [user],
  );

  const exportXls = () => {
    const exportCols: { key: string; title: string; render?: (row: Record<string, unknown>) => string }[] = [
      { key: 'title', title: 'Title' },
      ...(!isClient(user!.role)
        ? [{
            key: 'organization',
            title: 'Client',
            render: (r: Record<string, unknown>) => (r.organization as CrRow['organization'])?.name ?? '',
          }]
        : []),
      { key: 'moduleAffected', title: 'Module' },
      { key: 'status', title: 'Status', render: (r) => CR_STATUS_LABELS[String(r.status)] ?? String(r.status) },
      { key: 'priority', title: 'Priority' },
      { key: 'assignee', title: 'Assignee', render: (r) => (r.assignedStaff as CrRow['assignedStaff'])?.fullName ?? '' },
      { key: 'updatedAt', title: 'Updated', render: (r) => dayjs(String(r.updatedAt)).format('YYYY-MM-DD HH:mm') },
    ];
    exportRowsToXls(rows as unknown as Record<string, unknown>[], exportCols, `change-requests-${dayjs().format('YYYY-MM-DD')}.xls`);
  };

  const handleTableChange: TableProps<CrRow>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s?.field) {
      const field = String(Array.isArray(s.field) ? s.field[0] : s.field);
      const map: Record<string, SortField> = {
        title: 'title',
        status: 'status',
        priority: 'priority',
        moduleAffected: 'moduleAffected',
        updatedAt: 'updatedAt',
        organization: 'organization',
      };
      if (map[field]) setSortField(map[field]);
    }
    if (s?.order) setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {assignedToMe ? 'My assigned tickets' : 'Change requests'}
        </Typography.Title>
        {isClient(user!.role) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/change-requests/new')}>
            New request
          </Button>
        )}
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search title, module, client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="Filter status"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={Object.entries(CR_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          value={sortField}
          onChange={setSortField}
          style={{ width: 160 }}
          options={[
            { value: 'updatedAt', label: 'Sort: Updated' },
            { value: 'createdAt', label: 'Sort: Created' },
            { value: 'title', label: 'Sort: Title' },
            { value: 'status', label: 'Sort: Status' },
            { value: 'priority', label: 'Sort: Priority' },
            { value: 'moduleAffected', label: 'Sort: Module' },
            ...(!isClient(user!.role) ? [{ value: 'organization', label: 'Sort: Client' }] : []),
          ]}
        />
        <Select
          value={sortOrder}
          onChange={setSortOrder}
          style={{ width: 120 }}
          options={[
            { value: 'desc', label: 'Descending' },
            { value: 'asc', label: 'Ascending' },
          ]}
        />
        <Button icon={<DownloadOutlined />} onClick={exportXls} disabled={rows.length === 0}>
          Export XLS
        </Button>
      </Space>

      <Table
        loading={loading}
        rowKey="id"
        dataSource={rows}
        columns={columns}
        onChange={handleTableChange}
        onRow={(r) => ({ onClick: () => navigate(`/change-requests/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} requests` }}
      />
    </div>
  );
}
