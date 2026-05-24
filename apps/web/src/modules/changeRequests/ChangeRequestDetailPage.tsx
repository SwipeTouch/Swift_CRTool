import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { apiFetch, NOTIFICATIONS_CHANGED_EVENT } from '@/shared/api/client';
import { useAuth } from '@/shared/auth/AuthContext';
import { canApprove, isClient } from '@/shared/auth/permissions';
import { CR_STATUS_COLORS, CR_STATUS_LABELS } from '@/shared/constants';

interface CrDetail {
  id: string;
  title: string;
  description: string;
  moduleAffected: string;
  status: string;
  priority: string;
  rejectionReason?: string;
  organization: { name: string; code: string };
  requestedBy: { fullName: string };
  assignedStaff?: { id: string; fullName: string } | null;
  comments: { id: string; content: string; visibility: string; createdAt: string; author: { fullName: string; role: string } }[];
  workflowLogs: { newStatus: string; actionNote?: string; loggedAt: string; triggeredBy: { fullName: string } }[];
  externalTickets: { system: string; externalId: string; url?: string }[];
}

interface StaffOption {
  id: string;
  fullName: string;
}

export function ChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [cr, setCr] = useState<CrDetail | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [commentForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [reassignForm] = Form.useForm();

  const load = useCallback(() => {
    if (!id) return;
    apiFetch<{ changeRequest: CrDetail }>(`/change-requests/${id}`).then((r) => setCr(r.changeRequest));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (canApprove(user!.role)) {
      apiFetch<{ users: StaffOption[] }>('/users?staff=true&role=CS_MEMBER').then((r) =>
        setStaff(r.users.map((u) => ({ id: u.id, fullName: (u as StaffOption).fullName }))),
      );
    }
  }, [user]);

  if (!cr) return null;

  const transition = async (status: string, extra?: Record<string, string>) => {
    try {
      await apiFetch(`/change-requests/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ status, ...extra }),
      });
      message.success('Status updated');
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const returnToAdmin = async (values: { note: string }) => {
    try {
      await apiFetch(`/change-requests/${id}/return-to-admin`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      message.success('Ticket returned to admin for reassignment');
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      setReturnOpen(false);
      returnForm.resetFields();
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Return failed');
    }
  };

  const reassign = async (values: { assignedStaffId: string; note?: string }) => {
    try {
      await apiFetch(`/change-requests/${id}/reassign`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      message.success('Ticket reassigned');
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      setReassignOpen(false);
      reassignForm.resetFields();
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Reassign failed');
    }
  };

  const isAssignedToMe = user!.role === 'CS_MEMBER' && cr.assignedStaff?.id === user!.id;
  const canReturn =
    isAssignedToMe && (cr.status === 'APPROVED_ASSIGNED' || cr.status === 'IN_PROGRESS');
  const canReassign =
    canApprove(user!.role) && cr.status === 'APPROVED_ASSIGNED';

  const addComment = async (values: { content: string; visibility?: string }) => {
    try {
      await apiFetch(`/change-requests/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      commentForm.resetFields();
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const linkTicket = async (values: { system: string; externalId: string; url?: string }) => {
    try {
      await apiFetch(`/change-requests/${id}/external-tickets`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      message.success('Ticket linked');
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div>
      <Typography.Title level={3}>{cr.title}</Typography.Title>
      <Tag color={CR_STATUS_COLORS[cr.status]}>{CR_STATUS_LABELS[cr.status]}</Tag>
      <Tag>{cr.priority}</Tag>

      <Card style={{ marginTop: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Client">{cr.organization.name}</Descriptions.Item>
          <Descriptions.Item label="Module">{cr.moduleAffected}</Descriptions.Item>
          <Descriptions.Item label="Raised by">{cr.requestedBy.fullName}</Descriptions.Item>
          <Descriptions.Item label="Assigned staff">
            {cr.assignedStaff?.fullName ?? (cr.status === 'APPROVED_ASSIGNED' ? 'Unassigned — awaiting admin' : '—')}
          </Descriptions.Item>
          <Descriptions.Item label="Description">{cr.description}</Descriptions.Item>
          {cr.rejectionReason && (
            <Descriptions.Item label="Rejection reason">{cr.rejectionReason}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {!isClient(user!.role) && (
        <Card title="Actions" style={{ marginTop: 16 }}>
          <Space wrap>
            {canApprove(user!.role) && cr.status === 'PENDING_APPROVAL' && (
              <>
                <Button type="primary" onClick={() => setApproveOpen(true)}>
                  Approve & assign
                </Button>
                <Button danger onClick={() => transition('REJECTED', { note: 'Not in current scope' })}>
                  Reject
                </Button>
              </>
            )}
            {canReassign && (
              <Button onClick={() => setReassignOpen(true)}>
                {cr.assignedStaff ? 'Reassign staff' : 'Assign staff'}
              </Button>
            )}
            {canReturn && (
              <Button danger onClick={() => setReturnOpen(true)}>
                Return to admin
              </Button>
            )}
            {user!.role === 'CS_MEMBER' && cr.status === 'APPROVED_ASSIGNED' && isAssignedToMe && (
              <Button type="primary" onClick={() => transition('IN_PROGRESS')}>
                Start work
              </Button>
            )}
            {['CS_MEMBER', 'APPROVER', 'ADMIN'].includes(user!.role) && cr.status === 'IN_PROGRESS' && (
              <Button onClick={() => transition('RESOLVED')}>Mark resolved</Button>
            )}
            {canApprove(user!.role) && cr.status === 'RESOLVED' && (
              <Button onClick={() => transition('CLOSED')}>Close ticket</Button>
            )}
          </Space>
        </Card>
      )}

      <Card title="Timeline" style={{ marginTop: 16 }}>
        <List
          dataSource={cr.workflowLogs}
          renderItem={(log) => (
            <List.Item>
              <Typography.Text>
                {dayjs(log.loggedAt).format('DD MMM YYYY HH:mm')} — {CR_STATUS_LABELS[log.newStatus] ?? log.newStatus}{' '}
                by {log.triggeredBy.fullName}
                {log.actionNote ? `: ${log.actionNote}` : ''}
              </Typography.Text>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Updates" style={{ marginTop: 16 }}>
        <List
          dataSource={cr.comments}
          locale={{ emptyText: 'No updates yet' }}
          renderItem={(c) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <>
                    {c.author.fullName}{' '}
                    {c.visibility === 'CLIENT_VISIBLE' && <Tag color="green">Visible to client</Tag>}
                  </>
                }
                description={c.content}
              />
              <Typography.Text type="secondary">{dayjs(c.createdAt).format('DD MMM HH:mm')}</Typography.Text>
            </List.Item>
          )}
        />
        {!isClient(user!.role) && (
          <Form form={commentForm} layout="vertical" onFinish={addComment} style={{ marginTop: 16 }}>
            <Form.Item name="content" rules={[{ required: true }]}>
              <Input.TextArea rows={3} placeholder="Add internal note or client-visible update..." />
            </Form.Item>
            <Form.Item name="visibility" label="Visibility" initialValue="INTERNAL">
              <Select
                options={[
                  { value: 'INTERNAL', label: 'Internal only' },
                  { value: 'CLIENT_VISIBLE', label: 'Visible to client' },
                ]}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Add comment
            </Button>
          </Form>
        )}
      </Card>

      {!isClient(user!.role) && (
        <Card title="External tickets (JIRA / osTicket)" style={{ marginTop: 16 }}>
          <List
            dataSource={cr.externalTickets}
            locale={{ emptyText: 'No linked tickets' }}
            renderItem={(t) => (
              <List.Item>
                <Tag>{t.system}</Tag> {t.externalId}
                {t.url && (
                  <a href={t.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                )}
              </List.Item>
            )}
          />
          <Form layout="inline" onFinish={linkTicket} style={{ marginTop: 12 }}>
            <Form.Item name="system" rules={[{ required: true }]}>
              <Select
                style={{ width: 120 }}
                options={[
                  { value: 'JIRA', label: 'JIRA' },
                  { value: 'OSTICKET', label: 'osTicket' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            </Form.Item>
            <Form.Item name="externalId" rules={[{ required: true }]}>
              <Input placeholder="Ticket ID" />
            </Form.Item>
            <Form.Item name="url">
              <Input placeholder="URL (optional)" style={{ width: 220 }} />
            </Form.Item>
            <Button htmlType="submit">Link</Button>
          </Form>
        </Card>
      )}

      <Modal title="Return to admin" open={returnOpen} onCancel={() => setReturnOpen(false)} footer={null}>
        <Typography.Paragraph type="secondary">
          Use this when the ticket was assigned to the wrong person or needs a different SME. Admin will be notified
          and can reassign.
        </Typography.Paragraph>
        <Form form={returnForm} onFinish={returnToAdmin} layout="vertical">
          <Form.Item
            name="note"
            label="Reason for return"
            rules={[{ required: true, message: 'Please explain why this ticket is being returned' }]}
          >
            <Input.TextArea rows={4} placeholder="e.g. This requires Finance module expertise, not my area..." />
          </Form.Item>
          <Button type="primary" danger htmlType="submit">
            Return to admin
          </Button>
        </Form>
      </Modal>

      <Modal title="Reassign staff" open={reassignOpen} onCancel={() => setReassignOpen(false)} footer={null}>
        <Form
          form={reassignForm}
          onFinish={reassign}
          layout="vertical"
          initialValues={{ assignedStaffId: cr.assignedStaff?.id }}
        >
          <Form.Item name="assignedStaffId" label="Customer success staff" rules={[{ required: true }]}>
            <Select options={staff.map((s) => ({ value: s.id, label: s.fullName }))} />
          </Form.Item>
          <Form.Item name="note" label="Note for assignee">
            <Input.TextArea placeholder="Optional context for the new assignee..." />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Reassign
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Approve and assign staff"
        open={approveOpen}
        onCancel={() => setApproveOpen(false)}
        footer={null}
      >
        <Form
          onFinish={(v) => {
            transition('APPROVED_ASSIGNED', { assignedStaffId: v.assignedStaffId, note: v.note });
            setApproveOpen(false);
          }}
          layout="vertical"
        >
          <Form.Item name="assignedStaffId" label="Customer success staff" rules={[{ required: true }]}>
            <Select options={staff.map((s) => ({ value: s.id, label: s.fullName }))} />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input.TextArea />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Approve
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
