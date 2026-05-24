import { useEffect, useState } from 'react';
import { Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api/client';
import { CR_STATUS_COLORS, CR_STATUS_LABELS } from '@/shared/constants';

interface CrRow {
  id: string;
  title: string;
  moduleAffected: string;
  status: string;
  organization?: { name: string };
}

export function ApprovalsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CrRow[]>([]);

  useEffect(() => {
    apiFetch<{ changeRequests: CrRow[] }>('/change-requests?pendingApproval=true').then((r) =>
      setRows(r.changeRequests),
    );
  }, []);

  return (
    <div>
      <Typography.Title level={3}>Pending approvals</Typography.Title>
      <Table
        rowKey="id"
        dataSource={rows}
        onRow={(r) => ({ onClick: () => navigate(`/change-requests/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          { title: 'Client', render: (_: unknown, r: CrRow) => r.organization?.name },
          { title: 'Module', dataIndex: 'moduleAffected' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => <Tag color={CR_STATUS_COLORS[s]}>{CR_STATUS_LABELS[s]}</Tag>,
          },
        ]}
      />
    </div>
  );
}
