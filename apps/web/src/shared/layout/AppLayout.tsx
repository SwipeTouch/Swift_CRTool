import {
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  TeamOutlined,
  BarChartOutlined,
  UserOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { Avatar, Dropdown, Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { NotificationBell } from '@/shared/components/NotificationBell';
import {
  canApprove,
  canManageOrgs,
  canManageUsers,
  canViewReports,
  isClient,
  ROLE_LABELS,
} from '@/shared/auth/permissions';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = user!.role;

  const menuItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    {
      key: '/change-requests',
      icon: <FileTextOutlined />,
      label: isClient(role) ? 'My change requests' : 'Change requests',
    },
    ...(canApprove(role)
      ? [{ key: '/approvals', icon: <FileTextOutlined />, label: 'Pending approvals' }]
      : []),
    ...(canManageOrgs(role) || canManageUsers(role)
      ? [
          {
            key: 'admin',
            icon: <TeamOutlined />,
            label: 'Administration',
            children: [
              ...(canManageOrgs(role) || role === 'APPROVER'
                ? [{ key: '/admin/organizations', icon: <BankOutlined />, label: 'Institutions' }]
                : []),
              ...(canManageUsers(role)
                ? [{ key: '/admin/users', icon: <UserOutlined />, label: 'Users & staff' }]
                : []),
            ],
          },
        ]
      : []),
    ...(canViewReports(role)
      ? [{ key: '/reports', icon: <BarChartOutlined />, label: 'Reports' }]
      : []),
  ];

  const userMenu: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const roleLine = [ROLE_LABELS[role], user!.organizationName].filter(Boolean).join(' · ');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} className="crms-sider" breakpoint="lg" collapsedWidth={0}>
        <div style={{ padding: '20px 16px' }}>
          <Typography.Text className="crms-brand-title">Swipetouch CRMS</Typography.Text>
          {!isClient(role) && (
            <Typography.Text style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
              Internal portal
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          className="crms-menu"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="crms-app-header">
          <div className="crms-header-actions">
            <NotificationBell />
            <Dropdown
              menu={{ items: userMenu }}
              placement="bottomRight"
              trigger={['click']}
              getPopupContainer={() => document.body}
            >
              <button type="button" className="crms-user-menu-trigger" aria-label="Account menu">
                <Avatar size={36} style={{ background: 'var(--crms-primary)', flexShrink: 0 }}>
                  {user!.fullName.charAt(0)}
                </Avatar>
                <div className="crms-user-menu-text">
                  <span className="crms-user-name">{user!.fullName}</span>
                  <span className="crms-user-role">{roleLine}</span>
                </div>
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content className="crms-app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
