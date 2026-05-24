import { useState } from 'react';
import { Button, Card, Form, Input, Select, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api/client';
import { MODULE_OPTIONS } from '@/shared/constants';

export function ChangeRequestNewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    title: string;
    description: string;
    moduleAffected: string;
    priority: string;
  }) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ changeRequest: { id: string } }>('/change-requests', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      message.success('Change request submitted');
      navigate(`/change-requests/${res.changeRequest.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Typography.Title level={4}>Submit change request</Typography.Title>
      <Form layout="vertical" onFinish={onFinish} initialValues={{ priority: 'MEDIUM' }}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input placeholder="Brief summary of the change" />
        </Form.Item>
        <Form.Item name="moduleAffected" label="Module affected" rules={[{ required: true }]}>
          <Select options={MODULE_OPTIONS.map((m) => ({ value: m, label: m }))} />
        </Form.Item>
        <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' },
            ]}
          />
        </Form.Item>
        <Form.Item name="description" label="Description" rules={[{ required: true }]}>
          <Input.TextArea rows={6} placeholder="Describe the customization or change needed..." />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Submit for approval
        </Button>
      </Form>
    </Card>
  );
}
