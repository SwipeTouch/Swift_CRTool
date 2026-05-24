import { Badge, Button, Dropdown, Empty, Space, Tag, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { useNotifications, type ApprovalNotification } from '@/shared/hooks/useNotifications';

dayjs.extend(relativeTime);

const STATUS_CONFIG = {
  PENDING_APPROVAL: { color: 'gold', label: 'Pending' },
  RETURNED_FOR_REASSIGN: { color: 'orange', label: 'Needs reassignment' },
  ASSIGNED: { color: 'blue', label: 'New assignment' },
  APPROVED: { color: 'green', label: 'Approved' },
  REJECTED: { color: 'red', label: 'Rejected' },
} as const;

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, pendingCount, markRead, refresh, enabled } = useNotifications(user!.role);

  if (!enabled) return null;

  const open = (notificationId: string, crId: string) => {
    markRead(notificationId);
    navigate(`/change-requests/${crId}`);
  };

  const actionStatuses: ApprovalNotification['status'][] =
    user!.role === 'CS_MEMBER'
      ? ['ASSIGNED']
      : ['PENDING_APPROVAL', 'RETURNED_FOR_REASSIGN'];

  const menu = (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 24px rgba(15,23,42,0.12)',
        width: 380,
        maxHeight: 420,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography.Text strong>Notifications</Typography.Text>
        <Button type="link" size="small" onClick={() => navigate('/dashboard')}>
          View all
        </Button>
      </div>
      {notifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" style={{ padding: 24 }} />
      ) : (
        notifications.slice(0, 8).map((n) => {
          const cfg = STATUS_CONFIG[n.status as keyof typeof STATUS_CONFIG] ?? { color: 'default', label: n.status };
          const highlight = !n.isRead && actionStatuses.includes(n.status);
          return (
            <div
              key={n.id}
              onClick={() => open(n.id, n.changeRequest.id)}
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #f8fafc',
                cursor: 'pointer',
                background: highlight ? (n.status === 'ASSIGNED' ? '#eff6ff' : '#fffbeb') : '#fff',
              }}
            >
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Space wrap>
                  <Typography.Text strong={!n.isRead} ellipsis style={{ maxWidth: 220 }}>
                    {n.changeRequest.title}
                  </Typography.Text>
                  <Tag color={cfg.color}>{cfg.label}</Tag>
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {n.changeRequest.organization.name}
                  {n.actedBy ? ` · ${n.actedBy.fullName}` : ''}
                  {' · '}
                  {dayjs(n.updatedAt).fromNow()}
                </Typography.Text>
              </Space>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Dropdown
      trigger={['click']}
      onOpenChange={(o) => o && refresh()}
      dropdownRender={() => menu}
      getPopupContainer={() => document.body}
    >
      <Button
        type="text"
        icon={
          <Badge count={pendingCount} size="small" offset={[-2, 2]}>
            <BellOutlined style={{ fontSize: 18 }} />
          </Badge>
        }
      />
    </Dropdown>
  );
}
