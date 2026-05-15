import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Dropdown, Layout, Menu, Space } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { buildDashboardMenuItems } from './dashboardMenu';

const { Header, Sider, Content } = Layout;

export type DashboardShellProps = {
  selectedMenuKey: string;
  children: ReactNode;
};

const userMenu: MenuProps['items'] = [
  { key: 'profile', label: 'Profile' },
  { key: 'signout', label: 'Sign out' },
];

export function DashboardShell({ selectedMenuKey, children }: DashboardShellProps) {
  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Header
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          margin: 0,
          paddingInline: 20,
          height: 56,
          lineHeight: '56px',
          background: '#ffffff',
          borderBottom: '1px solid #e8e8e8',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }}>
          <img
            src="/logo.png"
            alt="57BLOCKS"
            style={{ height: 28, maxWidth: 240, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </Link>
        <Space size={20}>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Layout hasSider style={{ flex: 1, minHeight: 0 }}>
        <Sider
          width={248}
          theme="light"
          style={{
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
          }}
        >
          <Menu
            className="dashboard-sider-menu"
            mode="inline"
            defaultOpenKeys={['management']}
            selectedKeys={[selectedMenuKey]}
            style={{ borderInlineEnd: 0, fontSize: 13, paddingTop: 8 }}
            items={buildDashboardMenuItems()}
          />
        </Sider>

        <Content style={{ background: '#f3f5f6', minHeight: 'calc(100vh - 56px)', overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
