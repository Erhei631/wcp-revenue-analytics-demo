import { Typography } from 'antd';
import { EOR_BILLING_BREAKDOWN_CELL_LABELS, type EorBillingAmounts } from '../data/eorBillingDemo';
import { formatMoneyValue } from '../utils/moneyFormat';

const { Text } = Typography;

function moneyShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = Math.round((abs / 1000) * 10) / 10;
    const formatted = Number.isInteger(k) ? String(k) : k.toFixed(1);
    return `$${formatted}k`;
  }
  return `$${abs.toLocaleString('en-US')}`;
}

function FeeCellPartRow({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="analytics-revenue-fee-cell__part">
      <Text type="secondary" className="analytics-revenue-fee-cell__label">
        {label}
      </Text>
      <Text type="secondary" className="analytics-revenue-fee-cell__amount">
        {amount}
      </Text>
    </div>
  );
}

type EorBillingBreakdownCellProps = {
  amounts: EorBillingAmounts;
  muted?: boolean;
  showZeroAmount?: boolean;
};

export function EorBillingBreakdownCell({
  amounts,
  muted = false,
  showZeroAmount = false,
}: EorBillingBreakdownCellProps) {
  const total = amounts.serviceFeeRevenue + amounts.costs + amounts.credit;

  if (total === 0 && !showZeroAmount) {
    return <Text type="secondary">-</Text>;
  }

  const tone = muted ? 'secondary' : undefined;

  return (
    <div className="analytics-revenue-fee-cell">
      <Text strong={!muted} type={tone} className="analytics-revenue-fee-cell__total">
        {formatMoneyValue(total)}
      </Text>
      <FeeCellPartRow
        label={EOR_BILLING_BREAKDOWN_CELL_LABELS.serviceFee}
        amount={moneyShort(amounts.serviceFeeRevenue)}
      />
      <FeeCellPartRow
        label={EOR_BILLING_BREAKDOWN_CELL_LABELS.costs}
        amount={moneyShort(amounts.costs)}
      />
      <FeeCellPartRow
        label={EOR_BILLING_BREAKDOWN_CELL_LABELS.deposit}
        amount={moneyShort(amounts.credit)}
      />
    </div>
  );
}
