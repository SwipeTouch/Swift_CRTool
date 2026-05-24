import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { apiFetch } from '@/shared/api/client';
import { ROLE_LABELS, type AppRole } from '@/shared/auth/permissions';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
  organization?: { name: string } | null;
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const role = Form.useWatch('role', form);

  const load = () => apiFetch<{ users: UserRow[] }>('/users').then((r) => setUsers(r.users));

  useEffect(() => {
    load();
    apiFetch<{ organizations: { id: string; name: string }[] }>('/organizations').then((r) =>
      setOrgs(r.organizations),
    );
  }, []);

  const create = async (values: Record<string, string>) => {
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(values) });
      message.success('User created');
      setOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Users & staff
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add user
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={users}
        columns={[
          { title: 'Name', dataIndex: 'fullName' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role', render: (r: AppRole) => <Tag>{ROLE_LABELS[r]}</Tag> },
          { title: 'Organization', render: (_: unknown, u: UserRow) => u.organization?.name ?? '—' },
          { title: 'Active', dataIndex: 'isActive', render: (v: boolean) => (v ? 'Yes' : 'No') },
        ]}
      />
      <Modal title="Add user" open={open} onCancel={() => setOpen(false)} footer={null} width={480}>
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ role: 'CS_MEMBER' }}>
          <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={(['CLIENT', 'APPROVER', 'CS_MEMBER', 'ADMIN'] as AppRole[]).map((r) => ({
                value: r,
                label: ROLE_LABELS[r],
              }))}
            />
          </Form.Item>
          {role === 'CLIENT' && (
            <Form.Item name="organizationId" label="Organization" rules={[{ required: true }]}>
              <Select options={orgs.map((o) => ({ value: o.id, label: o.name }))} />
            </Form.Item>
          )}
          <Button type="primary" htmlType="submit">
            Create
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
