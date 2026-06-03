import { Avatar } from 'antd';
import type { ServiceFeeBreakdown } from '../data/accountFeeProfiles';
import { formatMoneyValue } from '../utils/moneyFormat';

type RepMeta = {
  name: string;
  avatarUrl?: string;
  color?: string;
};

type RevenueAnalyticsSummaryPanelProps = {
  totalRevenue: number;
  totalRevenueLabel?: string;
  breakdown: ServiceFeeBreakdown;
  eorOnly?: boolean;
  topRepName: string;
  topRepValue: number;
  topRepMeta: RepMeta | null;
  presaleEffort: number;
};

function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '—').toUpperCase();
}

function BreakdownMetric({
  label,
  amount,
  size = 'lg',
}: {
  label: string;
  amount: number;
  size?: 'lg' | 'sm';
}) {
  return (
    <span className={`revenue-analytics-summary__breakdown-metric revenue-analytics-summary__breakdown-metric--${size}`}>
      <span className="revenue-analytics-summary__breakdown-label">{label}</span>
      <strong>{formatMoneyValue(amount)}</strong>
    </span>
  );
}

export function RevenueAnalyticsSummaryPanel({
  totalRevenue,
  totalRevenueLabel = 'Total Revenue',
  breakdown,
  eorOnly = false,
  topRepName,
  topRepValue,
  topRepMeta,
  presaleEffort,
}: RevenueAnalyticsSummaryPanelProps) {
  const presaleFormatted = presaleEffort.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={
        eorOnly
          ? 'revenue-analytics-summary revenue-analytics-summary--eor-only'
          : 'revenue-analytics-summary'
      }
    >
      <div className="revenue-analytics-summary__card revenue-analytics-summary__card--revenue">
        <div className="revenue-analytics-summary__revenue-main">
          <div className="revenue-analytics-summary__title">{totalRevenueLabel}</div>
          <div className="revenue-analytics-summary__value">{formatMoneyValue(totalRevenue)}</div>
        </div>

        {!eorOnly ? (
          <div className="revenue-analytics-summary__breakdown">
            <div className="revenue-analytics-summary__breakdown-top">
              <BreakdownMetric label="Cash" amount={breakdown.cash} />
              <BreakdownMetric label="Equity" amount={breakdown.equity} />
            </div>
            <div className="revenue-analytics-summary__breakdown-inset-wrap">
              <div className="revenue-analytics-summary__breakdown-inset" role="group" aria-label="Cash breakdown">
                <BreakdownMetric label="Paid" amount={breakdown.paid} size="sm" />
                <BreakdownMetric label="Unpaid" amount={breakdown.unpaid} size="sm" />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="revenue-analytics-summary__card revenue-analytics-summary__card--rep">
        <div className="revenue-analytics-summary__title">Top Sales Rep</div>
        <div className="revenue-analytics-summary__metric">
          <div className="revenue-analytics-summary__rep">
            {topRepMeta ? (
              <Avatar
                size={32}
                src={topRepMeta.avatarUrl}
                alt={topRepMeta.name}
                style={{ flexShrink: 0, backgroundColor: topRepMeta.color, border: '1px solid #f0f0f0' }}
              >
                {personInitials(topRepMeta.name)}
              </Avatar>
            ) : null}
            <span className="revenue-analytics-summary__value revenue-analytics-summary__value--person">
              {topRepName}
            </span>
          </div>
          <span className="revenue-analytics-summary__side">{formatMoneyValue(topRepValue)}</span>
        </div>
      </div>

      {!eorOnly ? (
        <div className="revenue-analytics-summary__card revenue-analytics-summary__card--presale">
          <div className="revenue-analytics-summary__title">Presale Effort</div>
          <div className="revenue-analytics-summary__metric">
            <span className="revenue-analytics-summary__value">{presaleFormatted}</span>
            <span className="revenue-analytics-summary__side">Man/Month</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
