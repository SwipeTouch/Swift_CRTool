import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api/client';
import { useAuth } from '@/shared/auth/AuthContext';
import type { OrganizationFormValues, OrganizationRow } from '@/shared/types/organization';
import { formToOrgPayload, orgToFormValues } from '@/shared/types/organization';

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationRow | null>(null);
  const [form] = Form.useForm<OrganizationFormValues>();

  const load = () =>
    apiFetch<{ organizations: OrganizationRow[] }>('/organizations')
      .then((r) => setOrgs(r.organizations))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(orgToFormValues());
    setModalOpen(true);
  };

  const openEdit = (org: OrganizationRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(org);
    form.setFieldsValue(orgToFormValues(org));
    setModalOpen(true);
  };

  const save = async (values: OrganizationFormValues) => {
    try {
      const payload = formToOrgPayload(values, editing ?? undefined);
      if (editing) {
        await apiFetch(`/organizations/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        message.success('Institution updated');
      } else {
        await apiFetch('/organizations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        message.success('Institution created');
      }
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/organizations/${id}`, { method: 'DELETE' });
      message.success('Deleted');
      load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Educational institutions
          </Typography.Title>
          <Typography.Text type="secondary">
            Full profile, up to 2 designated CR raisers per institution. Click a row to open details.
          </Typography.Text>
        </div>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add institution
          </Button>
        )}
      </div>

      <Table
        loading={loading}
        rowKey="id"
        dataSource={orgs}
        onRow={(r) => ({
          onClick: () => navigate(`/admin/organizations/${r.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Institution', dataIndex: 'name', ellipsis: true },
          { title: 'Code', dataIndex: 'code', width: 110 },
          { title: 'City', dataIndex: 'city', width: 120, render: (v) => v ?? '—' },
          { title: 'Contact', dataIndex: 'primaryContactName', width: 140, render: (v) => v ?? '—' },
          { title: 'Email', dataIndex: 'contactEmail', ellipsis: true, render: (v) => v ?? '—' },
          { title: 'SLA (days)', dataIndex: 'slaDays', width: 90 },
          { title: 'Status', dataIndex: 'status', width: 90 },
          {
            title: 'Raisers',
            width: 80,
            render: (_: unknown, r: OrganizationRow) => r.users?.length ?? 0,
          },
          { title: 'CRs', width: 60, render: (_: unknown, r: OrganizationRow) => r._count.changeRequests },
          {
            title: 'Actions',
            width: 120,
            render: (_: unknown, r: OrganizationRow) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/admin/organizations/${r.id}`)}
                />
                {isAdmin && (
                  <>
                    <Button type="text" icon={<EditOutlined />} onClick={(e) => openEdit(r, e)} />
                    <Popconfirm title="Delete this institution?" onConfirm={() => remove(r.id)}>
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit institution' : 'Add institution'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Typography.Text strong>Institution profile</Typography.Text>
          <Form.Item name="name" label="Institution name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Login code" rules={[{ required: true }]}>
            <Input disabled={!!editing} placeholder="e.g. greenvalley" />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
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
          <Form.Item name="contactEmail" label="Institution email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="primaryContactName" label="Primary admin name">
            <Input placeholder="Head of institution / IT admin" />
          </Form.Item>
          <Space>
            <Form.Item name="slaDays" label="SLA (days to resolve)" initialValue={14}>
              <InputNumber min={1} max={90} />
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="active">
              <Select
                style={{ width: 120 }}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </Form.Item>
          </Space>

          <Typography.Text strong style={{ display: 'block', marginTop: 16 }}>
            Designated CR raisers (max 2)
          </Typography.Text>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            These users can log in and raise change requests for this institution.
          </Typography.Paragraph>
          <Form.Item name="raiser1Name" label="Raiser 1 — name" rules={[{ required: !editing }]}>
            <Input />
          </Form.Item>
          <Form.Item name="raiser1Email" label="Raiser 1 — email" rules={[{ required: !editing, type: 'email' }]}>
            <Input />
          </Form.Item>
          {!editing && (
            <Form.Item name="raiser1Password" label="Raiser 1 — password" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="raiser2Name" label="Raiser 2 — name (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="raiser2Email" label="Raiser 2 — email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          {!editing && (
            <Form.Item name="raiser2Password" label="Raiser 2 — password">
              <Input.Password />
            </Form.Item>
          )}

          <Button type="primary" htmlType="submit" block>
            {editing ? 'Save changes' : 'Create institution'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
