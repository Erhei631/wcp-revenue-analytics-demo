import { Typography } from 'antd';
import {
  feeProfileForClientId,
  splitServiceFeeTotal,
  type FeeAmountProfile,
} from '../data/accountFeeProfiles';
import type { DemoClientId } from '../data/demoClientCatalog';
import { FEE_BREAKDOWN_LINE_LABELS } from '../data/eorBillingDemo';
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

type ServiceFeeBreakdownCellProps = {
  serviceFeeTotal: number;
  clientId?: DemoClientId | null;
  profile?: FeeAmountProfile;
  muted?: boolean;
  /** When true, zero renders as $0 (and Equity/Cash $0) instead of "-". */
  showZeroAmount?: boolean;
  /** EOR projects: show revenue only, no Equity / Cash lines. */
  revenueOnly?: boolean;
  /** New Logo EOR rows: Service Fee line only (no Equity / Cash). */
  eorProject?: boolean;
};

const SERVICE_FEE_LINE_LABEL = 'Service Fee';

export function ServiceFeeBreakdownCell({
  serviceFeeTotal,
  clientId,
  profile,
  muted = false,
  showZeroAmount = false,
  revenueOnly = false,
  eorProject = false,
}: ServiceFeeBreakdownCellProps) {
  if (coerceAmount(serviceFeeTotal) === 0 && !showZeroAmount) {
    return <Text type="secondary">-</Text>;
  }

  const feeProfile = profile ?? feeProfileForClientId(clientId);
  const revenueOnlySplit = revenueOnly || eorProject;
  const fee = splitServiceFeeTotal(serviceFeeTotal, feeProfile, revenueOnlySplit);
  const tone = muted ? 'secondary' : undefined;

  if (revenueOnly && !eorProject) {
    return (
      <Text strong={!muted} type={tone}>
        {formatMoneyValue(fee.serviceFeeTotal)}
      </Text>
    );
  }

  if (eorProject) {
    return (
      <div className="analytics-revenue-fee-cell analytics-revenue-fee-cell--eor-only">
        <FeeCellPartRow label={SERVICE_FEE_LINE_LABEL} amount={formatMoneyValue(fee.serviceFeeTotal)} />
      </div>
    );
  }

  return (
    <div className="analytics-revenue-fee-cell">
      <Text strong={!muted} type={tone} className="analytics-revenue-fee-cell__total">
        {formatMoneyValue(fee.serviceFeeTotal)}
      </Text>
      <FeeCellPartRow label={FEE_BREAKDOWN_LINE_LABELS.equity} amount={moneyShort(fee.equity)} />
      <FeeCellPartRow label={FEE_BREAKDOWN_LINE_LABELS.cash} amount={moneyShort(fee.cash)} />
    </div>
  );
}
