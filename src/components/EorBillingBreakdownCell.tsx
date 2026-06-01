import { Typography } from 'antd';
import type { EorBillingAmounts } from '../data/eorBillingDemo';
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
      <Text type="secondary" className="analytics-revenue-fee-cell__part">
        Service Fee {moneyShort(amounts.serviceFeeRevenue)}
      </Text>
      <Text type="secondary" className="analytics-revenue-fee-cell__part">
        Cost {moneyShort(amounts.costs)}
      </Text>
      <Text type="secondary" className="analytics-revenue-fee-cell__part">
        Credit {moneyShort(amounts.credit)}
      </Text>
    </div>
  );
}
