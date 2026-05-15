import { Link } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { CompanyMenuIcon } from '../components/icons/CompanyMenuIcon';
import { ManagementMenuIcon } from '../components/icons/ManagementMenuIcon';
import { MyWorkMenuIcon } from '../components/icons/MyWorkMenuIcon';
import { ProjectTrackingMenuIcon } from '../components/icons/ProjectTrackingMenuIcon';

export function buildDashboardMenuItems(): MenuProps['items'] {
  return [
    {
      key: 'my-work',
      icon: <MyWorkMenuIcon />,
      label: 'My Work',
      children: [
        { key: 'log-time', label: 'Log Time' },
        { key: 'leave', label: 'Take Leave' },
        { key: 'application', label: 'Application' },
        { key: 'reimbursement', label: 'Reimbursement' },
      ],
    },
    {
      key: 'project-tracking',
      icon: <ProjectTrackingMenuIcon />,
      label: 'Project Tracking',
      children: [
        { key: 'team', label: 'Team' },
        { key: 'hiring', label: 'Hiring' },
        { key: 'feed', label: 'Feed' },
        { key: 'billing', label: 'Billing' },
        { key: 'proposal', label: 'Proposal' },
      ],
    },
    {
      key: 'company',
      icon: <CompanyMenuIcon />,
      label: 'Company',
      children: [
        { key: 'resource', label: 'Resource Pool' },
        { key: 'policy', label: 'Policy' },
        { key: 'newsletter', label: 'Newsletter' },
        { key: 'ai-tools', label: 'AI Tools' },
      ],
    },
    {
      key: 'management',
      icon: <ManagementMenuIcon />,
      label: 'Management',
      children: [
        { key: 'hiring-dashboard', label: 'Hiring Dashboard' },
        { key: 'billing-dashboard', label: <Link to="/">Billing Dashboard</Link> },
        { key: 'proposal-dashboard', label: 'Proposal Dashboard' },
      ],
    },
  ];
}
