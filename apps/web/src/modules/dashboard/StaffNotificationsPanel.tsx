import { Badge, Card, List, Space, Tag, Typography } from 'antd';
import { BellOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { useAuth } from '@/shared/auth/AuthContext';

dayjs.extend(relativeTime);

const STATUS_CONFIG = {
  ASSIGNED: { color: 'blue', label: 'New assignment' },
  PENDING_APPROVAL: { color: 'gold', label: 'Pending' },
  RETURNED_FOR_REASSIGN: { color: 'orange', label: 'Returned' },
  APPROVED: { color: 'green', label: 'Approved' },
  REJECTED: { color: 'red', label: 'Rejected' },
} as const;

export function StaffNotificationsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, pendingCount, markRead } = useNotifications(user!.role);

  const items = notifications.filter((n) => n.status === 'ASSIGNED').slice(0, 6);

  return (
    <Card
      className="crms-dash-card"
      title={
        <Space size={6}>
          <BellOutlined />
          <span>Assignments & updates</span>
          {pendingCount > 0 && <Badge count={pendingCount} size="small" />}
        </Space>
      }
      extra={
        <Link to="/change-requests?assignedToMe=true">
          My queue <RightOutlined />
        </Link>
      }
      styles={{ body: { paddingTop: 8, maxHeight: 280, overflow: 'auto' } }}
    >
      {items.length === 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          No new assignments
        </Typography.Text>
      ) : (
        <List
          size="small"
          split={false}
          dataSource={items}
          renderItem={(n) => {
            const cfg = STATUS_CONFIG[n.status as keyof typeof STATUS_CONFIG] ?? { color: 'default', label: n.status };
            return (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderBottom: '1px solid #f1f5f9',
                  background: !n.isRead ? '#eff6ff' : undefined,
                }}
                onClick={() => {
                  markRead(n.id);
                  navigate(`/change-requests/${n.changeRequest.id}`);
                }}
              >
                <div style={{ width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <Typography.Text strong={!n.isRead} ellipsis style={{ flex: 1, fontSize: 13 }}>
                      {n.changeRequest.title}
                    </Typography.Text>
                    <Tag color={cfg.color} style={{ margin: 0, flexShrink: 0 }}>
                      {cfg.label}
                    </Tag>
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {n.changeRequest.organization.name}
                    {n.actedBy ? ` · from ${n.actedBy.fullName}` : ''}
                    {' · '}
                    {dayjs(n.updatedAt).fromNow()}
                  </Typography.Text>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
