import { useState } from 'react';
import { LockOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Radio, Typography, message } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';

type LoginMode = 'client' | 'internal';

interface LoginForm {
  mode: LoginMode;
  organizationCode?: string;
  email: string;
  password: string;
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginForm>();
  const mode = Form.useWatch('mode', form) ?? 'client';

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      await login(
        values.email,
        values.password,
        values.mode === 'client' ? values.organizationCode : undefined,
      );
      message.success('Welcome back');
      navigate(from, { replace: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crms-login-page">
      <div className="crms-login-brand">
        <Typography.Text style={{ color: '#99f6e4', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}>
          SWIPETOUCH
        </Typography.Text>
        <h1>Change Request Management</h1>
        <p>
          Schools and colleges submit customization requests, track progress, and receive updates.
          Internal teams approve, assign staff, and link JIRA or osTicket work items.
        </p>
      </div>
      <div className="crms-login-panel">
        <Card className="crms-login-card" bordered={false}>
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            Sign in
          </Typography.Title>
          <Form<LoginForm>
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              mode: 'client',
              organizationCode: 'demoschool',
              email: 'client@demoschool.local',
              password: 'demo123',
            }}
          >
            <Form.Item name="mode" label="Portal">
              <Radio.Group
                options={[
                  { label: 'Client (school/college)', value: 'client' },
                  { label: 'Internal (admin / staff)', value: 'internal' },
                ]}
              />
            </Form.Item>

            {mode === 'client' && (
              <Form.Item
                name="organizationCode"
                label="Organization code"
                rules={[{ required: true }]}
              >
                <Input prefix={<BankOutlined />} placeholder="demoschool" size="large" />
              </Form.Item>
            )}

            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input prefix={<MailOutlined />} size="large" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Sign in
            </Button>
          </Form>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            Demo: client@demoschool.local / demoschool · admin@swipetouch.local (internal) · password demo123
          </Typography.Paragraph>
        </Card>
      </div>
    </div>
  );
}
