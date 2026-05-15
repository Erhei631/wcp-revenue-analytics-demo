import { Button, Space, Tooltip, Typography } from 'antd';
import { ExportOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const { Link: TextLink } = Typography;

export type RevenueAnalyticsToolbarButtonProps = {
  /** In-app navigation (SPA). Takes precedence over `revenueAnalyticsHref`. */
  revenueAnalyticsTo?: string;
  /** External or same-tab URL when `revenueAnalyticsTo` is not set. */
  revenueAnalyticsHref?: string;
  canAccess?: boolean;
  isAdminOnly?: boolean;
  /** Override default admin tooltip (e.g. i18n). */
  adminTooltipTitle?: ReactNode;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

const defaultAdminTooltip = 'Admin only · Opens revenue analytics for this billing context';

const revenueAnalyticsButtonProps = {
  type: 'default' as const,
  className: 'billing-revenue-analytics-btn',
  icon: <ExportOutlined />,
  children: 'Revenue Analytics',
};

export function RevenueAnalyticsToolbarButton({
  revenueAnalyticsTo,
  revenueAnalyticsHref,
  canAccess = true,
  isAdminOnly = true,
  adminTooltipTitle = defaultAdminTooltip,
}: RevenueAnalyticsToolbarButtonProps) {
  if (!canAccess) return null;
  if (revenueAnalyticsTo == null && revenueAnalyticsHref == null) return null;

  const external = revenueAnalyticsHref ? isExternalHref(revenueAnalyticsHref) : false;

  const inner =
    revenueAnalyticsTo != null ? (
      <Link to={revenueAnalyticsTo} style={{ display: 'inline-block' }}>
        <Button {...revenueAnalyticsButtonProps} />
      </Link>
    ) : (
      <Button
        {...revenueAnalyticsButtonProps}
        href={revenueAnalyticsHref}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      />
    );

  if (isAdminOnly) {
    return <Tooltip title={adminTooltipTitle}>{inner}</Tooltip>;
  }

  return inner;
}

export type BillingToolbarRightActionsProps = RevenueAnalyticsToolbarButtonProps & {
  /** Your existing Status Color control (icon + link/popover). Omit to only render the analytics button. */
  statusColorControl?: ReactNode;
};

/**
 * Convenience row: Revenue Analytics then Status Color (matches layout spec).
 */
export function BillingToolbarRightActions({
  revenueAnalyticsTo,
  revenueAnalyticsHref,
  canAccess = true,
  isAdminOnly = true,
  adminTooltipTitle,
  statusColorControl,
}: BillingToolbarRightActionsProps) {
  return (
    <Space size="middle" align="center" wrap>
      <RevenueAnalyticsToolbarButton
        revenueAnalyticsTo={revenueAnalyticsTo}
        revenueAnalyticsHref={revenueAnalyticsHref}
        canAccess={canAccess}
        isAdminOnly={isAdminOnly}
        adminTooltipTitle={adminTooltipTitle}
      />
      {statusColorControl ?? (
        <Space size={4}>
          <QuestionCircleOutlined style={{ color: 'var(--ant-color-text-secondary, #8c8c8c)' }} />
          <TextLink>Status Color</TextLink>
        </Space>
      )}
    </Space>
  );
}
