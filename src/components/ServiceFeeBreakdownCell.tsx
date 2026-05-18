import { Typography } from 'antd';
import {
  feeProfileForClientId,
  splitServiceFeeTotal,
  type FeeAmountProfile,
} from '../data/accountFeeProfiles';
import type { DemoClientId } from '../data/demoClientCatalog';

const { Text } = Typography;

function money(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}

function moneyShort(n: number) {
  const abs = Math.abs(n);
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
};

export function ServiceFeeBreakdownCell({
  serviceFeeTotal,
  clientId,
  profile,
  muted = false,
}: ServiceFeeBreakdownCellProps) {
  if (serviceFeeTotal <= 0) {
    return <Text type="secondary">{money(0)}</Text>;
  }

  const feeProfile = profile ?? feeProfileForClientId(clientId);
  const fee = splitServiceFeeTotal(serviceFeeTotal, feeProfile);
  const tone = muted ? 'secondary' : undefined;

  return (
    <div className="analytics-revenue-fee-cell">
      <Text strong={!muted} type={tone} className="analytics-revenue-fee-cell__total">
        {money(fee.serviceFeeTotal)}
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
