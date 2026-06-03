import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { DEFAULT_FEE_PROFILE } from '../data/accountFeeProfiles';
import {
  EOR_BILLING_ITEM_HINTS,
  EOR_BILLING_ITEM_LABELS,
  EOR_BILLING_TABLE_LABELS,
  type EorBillingSummary,
} from '../data/eorBillingDemo';
import { formatMoneyValue } from '../utils/moneyFormat';

type EorBillingSummaryPanelProps = {
  summary: EorBillingSummary;
  /** Security Deposit (credit) summed across all demo months, same client/sales filters. */
  securityDepositAllTime?: number;
};

function formatUsd(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}

function splitPaidUnpaid(total: number) {
  if (total <= 0) {
    return { paid: 0, unpaid: 0 };
  }

  const base = DEFAULT_FEE_PROFILE.paid + DEFAULT_FEE_PROFILE.unpaid;
  if (base <= 0) {
    return { paid: 0, unpaid: total };
  }

  const paid = Math.round(total * (DEFAULT_FEE_PROFILE.paid / base));
  return { paid, unpaid: total - paid };
}

function SummaryTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="revenue-analytics-summary__title">
      <span>{title}</span>
      {hint ? (
        <Tooltip title={hint}>
          <QuestionCircleOutlined
            className="revenue-analytics-summary__title-hint"
            aria-label={`About ${title}`}
          />
        </Tooltip>
      ) : null}
    </div>
  );
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

export function EorBillingSummaryPanel({ summary, securityDepositAllTime }: EorBillingSummaryPanelProps) {
  const eorTotal = summary.serviceFeeRevenue + summary.costs + summary.credit;
  const { paid, unpaid } = splitPaidUnpaid(eorTotal);

  const metricCards: { key: string; title: string; value: string; hint?: string }[] = [
    {
      key: 'service-fee',
      title: EOR_BILLING_ITEM_LABELS.serviceFee,
      hint: EOR_BILLING_ITEM_HINTS.serviceFee,
      value: formatUsd(summary.serviceFeeRevenue),
    },
    {
      key: 'cost',
      title: EOR_BILLING_ITEM_LABELS.passThroughCosts,
      hint: EOR_BILLING_ITEM_HINTS.passThroughCosts,
      value: formatUsd(summary.costs),
    },
    {
      key: 'credit',
      title: EOR_BILLING_ITEM_LABELS.securityDeposit,
      hint: EOR_BILLING_ITEM_HINTS.securityDeposit,
      value: formatUsd(summary.credit),
    },
    {
      key: 'projects',
      title: EOR_BILLING_TABLE_LABELS.projects,
      value: summary.projectCount.toLocaleString('en-US'),
    },
  ];

  return (
    <div className="revenue-analytics-summary revenue-analytics-summary--eor-billing">
      <div className="revenue-analytics-summary__card revenue-analytics-summary__card--eor-total">
        <div className="revenue-analytics-summary__revenue-main">
          <div className="revenue-analytics-summary__title">{EOR_BILLING_TABLE_LABELS.eorTotal}</div>
          <div className="revenue-analytics-summary__value">{formatUsd(eorTotal)}</div>
        </div>

        <div className="revenue-analytics-summary__breakdown revenue-analytics-summary__breakdown--stacked">
          <BreakdownMetric label={EOR_BILLING_TABLE_LABELS.paid} amount={paid} />
          <BreakdownMetric label={EOR_BILLING_TABLE_LABELS.unpaid} amount={unpaid} />
        </div>
      </div>

      {metricCards.map((item) => (
        <div key={item.key} className="revenue-analytics-summary__card revenue-analytics-summary__card--metric">
          <SummaryTitle title={item.title} hint={item.hint} />
          <div className="revenue-analytics-summary__metric">
            <span className="revenue-analytics-summary__value">{item.value}</span>
            {item.key === 'credit' && securityDepositAllTime != null ? (
              <span className="revenue-analytics-summary__side">{formatMoneyValue(securityDepositAllTime)}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
