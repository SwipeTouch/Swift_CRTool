import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiFetch } from '@/shared/api/client';
import { useAuth } from '@/shared/auth/AuthContext';
import { CR_STATUS_COLORS, CR_STATUS_LABELS } from '@/shared/constants';
import type { OrganizationFormValues, OrganizationRow } from '@/shared/types/organization';
import { formToOrgPayload, orgToFormValues } from '@/shared/types/organization';

interface CrRow {
  id: string;
  title: string;
  status: string;
  moduleAffected: string;
  priority: string;
  slaDueAt?: string | null;
  createdAt: string;
  requestedBy: { fullName: string };
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

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [org, setOrg] = useState<OrganizationRow | null>(null);
  const [crs, setCrs] = useState<CrRow[]>([]);
  const [form] = Form.useForm<OrganizationFormValues>();

  const load = useCallback(() => {
    if (!id) return;
    apiFetch<{ organization: OrganizationRow }>(`/organizations/${id}`).then((r) => {
      setOrg(r.organization);
      form.setFieldsValue(orgToFormValues(r.organization));
    });
    apiFetch<{ changeRequests: CrRow[] }>(`/organizations/${id}/change-requests`).then((r) =>
      setCrs(r.changeRequests),
    );
  }, [id, form]);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async (values: OrganizationFormValues) => {
    try {
      await apiFetch(`/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formToOrgPayload(values, org ?? undefined)),
      });
      message.success('Profile saved');
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (!org) return null;

  const breached = crs.filter(
    (c) =>
      c.slaDueAt &&
      !['CLOSED', 'REJECTED', 'RESOLVED'].includes(c.status) &&
      dayjs(c.slaDueAt).isBefore(dayjs()),
  ).length;

  const tabs = [
    {
      key: 'profile',
      label: 'Profile',
      children: (
        <Card>
          {isAdmin ? (
          <Form form={form} layout="vertical" onFinish={saveProfile}>
            <Form.Item name="name" label="Institution name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="code" label="Login code">
              <Input disabled />
            </Form.Item>
            <Space style={{ width: '100%' }}>
              <Form.Item name="city" label="City" style={{ flex: 1 }}>
                <Input />
              </Form.Item>
              <Form.Item name="country" label="Country" style={{ flex: 1 }}>
                <Input />
              </Form.Item>
            </Space>
            <Form.Item name="address" label="Address">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="contactPhone" label="Contact phone">
              <Input />
            </Form.Item>
            <Form.Item name="contactEmail" label="Email">
              <Input />
            </Form.Item>
            <Form.Item name="primaryContactName" label="Primary admin name">
              <Input />
            </Form.Item>
            <Form.Item name="slaDays" label="SLA days">
              <InputNumber min={1} max={90} />
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </Form.Item>
            <Typography.Text strong>Designated CR raisers</Typography.Text>
            <Form.Item name="raiser1Name" label="Raiser 1 name">
              <Input />
            </Form.Item>
            <Form.Item name="raiser1Email" label="Raiser 1 email">
              <Input />
            </Form.Item>
            <Form.Item name="raiser1Password" label="Reset password (optional)">
              <Input.Password placeholder="Leave blank to keep" />
            </Form.Item>
            <Form.Item name="raiser2Name" label="Raiser 2 name">
              <Input />
            </Form.Item>
            <Form.Item name="raiser2Email" label="Raiser 2 email">
              <Input />
            </Form.Item>
            <Form.Item name="raiser2Password" label="Reset password (optional)">
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Save profile
            </Button>
          </Form>
          ) : (
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Name">{org.name}</Descriptions.Item>
              <Descriptions.Item label="Code">{org.code}</Descriptions.Item>
              <Descriptions.Item label="City">{org.city ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Address">{org.address ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{org.contactPhone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{org.contactEmail ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Primary admin">{org.primaryContactName ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="SLA">{org.slaDays} days</Descriptions.Item>
              <Descriptions.Item label="Raisers">
                {org.users?.map((u) => `${u.fullName} (${u.email})`).join(' · ') || '—'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      ),
    },
    {
      key: 'crs',
      label: `Change requests (${crs.length})`,
      children: (
        <Table
          rowKey="id"
          dataSource={crs}
          onRow={(r) => ({
            onClick: () => navigate(`/change-requests/${r.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Title', dataIndex: 'title', ellipsis: true },
            { title: 'Module', dataIndex: 'moduleAffected' },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => <Tag color={CR_STATUS_COLORS[s]}>{CR_STATUS_LABELS[s]}</Tag>,
            },
            { title: 'Raised by', render: (_: unknown, r: CrRow) => r.requestedBy.fullName },
            { title: 'Created', render: (_: unknown, r: CrRow) => dayjs(r.createdAt).format('DD MMM YYYY') },
            { title: 'SLA', render: (_: unknown, r: CrRow) => slaTag(r.status, r.slaDueAt) },
          ]}
        />
      ),
    },
    {
      key: 'sla',
      label: 'SLA',
      children: (
        <Card>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="SLA target">{org.slaDays} days from submission</Descriptions.Item>
            <Descriptions.Item label="Open CRs">{crs.filter((c) => !['CLOSED', 'REJECTED'].includes(c.status)).length}</Descriptions.Item>
            <Descriptions.Item label="SLA breaches">
              <Tag color={breached > 0 ? 'red' : 'green'}>{breached}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Compliance">
              {crs.length === 0
                ? '—'
                : `${Math.round(((crs.length - breached) / crs.length) * 100)}% on track`}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/organizations')} style={{ paddingLeft: 0 }}>
        Back to institutions
      </Button>
      <Typography.Title level={3}>{org.name}</Typography.Title>
      <Typography.Text type="secondary">
        {org.city ? `${org.city}, ` : ''}
        {org.country} · Code: {org.code}
      </Typography.Text>
      <Tabs items={tabs} style={{ marginTop: 16 }} />
    </div>
  );
}
