import { Badge, Button, Card, List, Space, Tag, Typography } from 'antd';
import { BellOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link, useNavigate } from 'react-router-dom';
import type { ApprovalNotification } from '@/shared/hooks/useNotifications';

dayjs.extend(relativeTime);

const STATUS_CONFIG: Record<
  ApprovalNotification['status'],
  { color: string; label: string }
> = {
  PENDING_APPROVAL: { color: 'gold', label: 'Pending' },
  RETURNED_FOR_REASSIGN: { color: 'orange', label: 'Needs reassignment' },
  ASSIGNED: { color: 'blue', label: 'Assigned' },
  APPROVED: { color: 'green', label: 'Approved' },
  REJECTED: { color: 'red', label: 'Rejected' },
};

interface Props {
  notifications: ApprovalNotification[];
  pendingCount: number;
  onMarkRead: (id: string) => void;
  onRefresh: () => void;
  /** Dashboard mode: pending only, capped list */
  compact?: boolean;
  pendingOnly?: boolean;
  maxItems?: number;
}

export function ApprovalNotificationsPanel({
  notifications,
  pendingCount,
  onMarkRead,
  onRefresh,
  compact = false,
  pendingOnly = false,
  maxItems,
}: Props) {
  const navigate = useNavigate();

  const openCr = (n: ApprovalNotification) => {
    onMarkRead(n.id);
    navigate(`/change-requests/${n.changeRequest.id}`);
  };

  let items = notifications;
  if (pendingOnly) {
    items = items.filter((n) => n.status === 'PENDING_APPROVAL' || n.status === 'RETURNED_FOR_REASSIGN');
  }
  if (maxItems != null) {
    items = items.slice(0, maxItems);
  }

  const content =
    items.length === 0 ? (
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {pendingOnly ? 'No CRs waiting for approval' : 'No notifications'}
      </Typography.Text>
    ) : (
      <List
        size="small"
        split={false}
        dataSource={items}
        renderItem={(n) => {
          const cfg = STATUS_CONFIG[n.status];
          return (
            <List.Item
              style={{
                cursor: 'pointer',
                padding: compact ? '6px 0' : '10px 0',
                borderBottom: '1px solid #f1f5f9',
                background:
                  !n.isRead && (n.status === 'PENDING_APPROVAL' || n.status === 'RETURNED_FOR_REASSIGN')
                    ? '#fffbeb'
                    : undefined,
                borderRadius: 4,
              }}
              onClick={() => openCr(n)}
            >
              <div style={{ width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <Typography.Text
                    strong={!n.isRead}
                    ellipsis
                    style={{ flex: 1, fontSize: compact ? 13 : 14 }}
                  >
                    {n.changeRequest.title}
                  </Typography.Text>
                  <Tag color={cfg.color} style={{ margin: 0, flexShrink: 0 }}>
                    {cfg.label}
                  </Tag>
                </div>
                <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                  {n.changeRequest.organization.name}
                  {!compact && ` · ${n.changeRequest.moduleAffected}`}
                  {' · '}
                  {dayjs(n.updatedAt).fromNow()}
                </Typography.Text>
              </div>
            </List.Item>
          );
        }}
      />
    );

  if (compact) {
    return (
      <Card
        className="crms-dash-card"
        title={
          <Space size={6}>
            <BellOutlined />
            <span>Pending approvals</span>
            {pendingCount > 0 && <Badge count={pendingCount} size="small" />}
          </Space>
        }
        extra={
          <Link to="/approvals">
            View all <RightOutlined />
          </Link>
        }
        styles={{ body: { paddingTop: 8, maxHeight: 280, overflow: 'auto' } }}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <BellOutlined />
          Approval notifications
          {pendingCount > 0 && <Badge count={pendingCount} />}
        </Space>
      }
      extra={
        <Button type="link" onClick={onRefresh}>
          Refresh
        </Button>
      }
      style={{ marginBottom: 24 }}
    >
      {content}
    </Card>
  );
}
