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
  isSingleRep: boolean;
  shareOfTeam: number | null;
  topRepName: string;
  topRepValue: number;
  topRepMeta: RepMeta | null;
  viewTotal: number;
  presaleEffort: number;
};

function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '—').toUpperCase();
}

function DetailMetric({ label, amount }: { label: string; amount: number }) {
  return (
    <span className="revenue-analytics-summary__detail-metric">
      <span className="revenue-analytics-summary__detail-label">{label}</span>
      <strong>{formatMoneyValue(amount)}</strong>
    </span>
  );
}

export function RevenueAnalyticsSummaryPanel({
  totalRevenue,
  totalRevenueLabel = 'Total Revenue',
  breakdown,
  eorOnly = false,
  isSingleRep,
  shareOfTeam,
  topRepName,
  topRepValue,
  topRepMeta,
  viewTotal,
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
      <div className="revenue-analytics-summary__cards">
        <div className="revenue-analytics-summary__card">
          <div className="revenue-analytics-summary__title">{totalRevenueLabel}</div>
          <div className="revenue-analytics-summary__metric revenue-analytics-summary__metric--solo">
            <span className="revenue-analytics-summary__value">{formatMoneyValue(totalRevenue)}</span>
          </div>
        </div>

        <div className="revenue-analytics-summary__card">
          <div className="revenue-analytics-summary__title">
            {isSingleRep ? 'Share of team' : 'Top Sales Rep'}
          </div>
          <div className="revenue-analytics-summary__metric">
            {isSingleRep ? (
              <span className="revenue-analytics-summary__value revenue-analytics-summary__value--person">
                {shareOfTeam ?? 0}%
              </span>
            ) : (
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
            )}
            <span className="revenue-analytics-summary__side">
              {formatMoneyValue(isSingleRep ? viewTotal : topRepValue)}
            </span>
          </div>
        </div>

        {!eorOnly ? (
          <div className="revenue-analytics-summary__card">
            <div className="revenue-analytics-summary__title">Presale Effort</div>
            <div className="revenue-analytics-summary__metric">
              <span className="revenue-analytics-summary__value">{presaleFormatted}</span>
              <span className="revenue-analytics-summary__side">Man/Month</span>
            </div>
          </div>
        ) : null}
      </div>

      {!eorOnly ? (
        <div className="revenue-analytics-summary__detail" role="group" aria-label="Total revenue breakdown">
          <DetailMetric label="Equity" amount={breakdown.equity} />
          <span className="revenue-analytics-summary__detail-sep revenue-analytics-summary__detail-sep--pipe" aria-hidden>
            |
          </span>
          <DetailMetric label="Cash" amount={breakdown.cash} />
          <span className="revenue-analytics-summary__detail-sep revenue-analytics-summary__detail-sep--dot" aria-hidden>
            ·
          </span>
          <DetailMetric label="Paid" amount={breakdown.paid} />
          <span className="revenue-analytics-summary__detail-sep revenue-analytics-summary__detail-sep--dot" aria-hidden>
            ·
          </span>
          <DetailMetric label="Unpaid" amount={breakdown.unpaid} />
        </div>
      ) : null}
    </div>
  );
}
