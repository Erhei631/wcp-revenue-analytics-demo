import { Typography } from 'antd';
import {
  feeProfileForClientId,
  splitServiceFeeTotal,
  type FeeAmountProfile,
} from '../data/accountFeeProfiles';
import type { DemoClientId } from '../data/demoClientCatalog';
import { coerceAmount, formatMoneyValue } from '../utils/moneyFormat';

const { Text } = Typography;

function moneyShort(n: number) {
  const abs = Math.abs(coerceAmount(n));
  if (abs >= 1000) {
    const k = Math.round((abs / 1000) * 10) / 10;
    const formatted = Number.isInteger(k) ? String(k) : k.toFixed(1);
    return `$${formatted}k`;
  }
  return `$${abs.toLocaleString('en-US')}`;
}

type ServiceFeeBreakdownCellProps = {
  serviceFeeTotal: number;
  clientId?: DemoClientId | null;
  profile?: FeeAmountProfile;
  muted?: boolean;
  /** When true, zero renders as $0 (and Equity/Cash $0) instead of "-". */
  showZeroAmount?: boolean;
};

export function ServiceFeeBreakdownCell({
  serviceFeeTotal,
  clientId,
  profile,
  muted = false,
  showZeroAmount = false,
}: ServiceFeeBreakdownCellProps) {
  if (coerceAmount(serviceFeeTotal) === 0 && !showZeroAmount) {
    return <Text type="secondary">-</Text>;
  }

  const feeProfile = profile ?? feeProfileForClientId(clientId);
  const fee = splitServiceFeeTotal(serviceFeeTotal, feeProfile);
  const tone = muted ? 'secondary' : undefined;

  return (
    <div className="analytics-revenue-fee-cell">
      <Text strong={!muted} type={tone} className="analytics-revenue-fee-cell__total">
        {formatMoneyValue(fee.serviceFeeTotal)}
      </Text>
      <Text type="secondary" className="analytics-revenue-fee-cell__part">
        Equity {moneyShort(fee.equity)}
      </Text>
      <Text type="secondary" className="analytics-revenue-fee-cell__part">
        Cash {moneyShort(fee.cash)}
      </Text>
    </div>
  );
}
