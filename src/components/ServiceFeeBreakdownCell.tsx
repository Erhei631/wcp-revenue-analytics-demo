import type { ReactNode } from 'react';
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

const TOTAL_LINE_LABEL = 'Total';
const SERVICE_FEE_LINE_LABEL = 'EOR Service Fee';

export type ServiceFeeBreakdownProps = {
  serviceFeeTotal: number;
  clientId?: DemoClientId | null;
  profile?: FeeAmountProfile;
  muted?: boolean;
  /** When true, zero renders as $0 (and Equity/Cash $0) instead of "-". */
  showZeroAmount?: boolean;
  /** EOR projects: show revenue only, no Equity / Cash breakdown. */
  revenueOnly?: boolean;
  /** New Logo EOR rows: Service Fee line only (no Equity / Cash). */
  eorProject?: boolean;
};

function moneyShort(n: number) {
  const abs = Math.abs(coerceAmount(n));
  if (abs >= 1000) {
    const k = Math.round((abs / 1000) * 10) / 10;
    const formatted = Number.isInteger(k) ? String(k) : k.toFixed(1);
    return `$${formatted}k`;
  }
  return `$${abs.toLocaleString('en-US')}`;
}

function resolveFeeBreakdown({
  serviceFeeTotal,
  clientId,
  profile,
  showZeroAmount = false,
  revenueOnly = false,
  eorProject = false,
}: ServiceFeeBreakdownProps) {
  const total = coerceAmount(serviceFeeTotal);
  if (total === 0 && !showZeroAmount) {
    return { empty: true as const };
  }

  const feeProfile = profile ?? feeProfileForClientId(clientId);
  const revenueOnlySplit = revenueOnly || eorProject;
  const fee = splitServiceFeeTotal(total, feeProfile, revenueOnlySplit);

  return {
    empty: false as const,
    fee,
    revenueOnly: revenueOnly && !eorProject,
    eorProject,
  };
}

function SplitMiniCell({
  children,
  tone = 'default',
  align = 'right',
}: {
  children: ReactNode;
  tone?: 'default' | 'total' | 'muted';
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={`analytics-revenue-fee-split-mini-cell analytics-revenue-fee-split-mini-cell--${tone} analytics-revenue-fee-split-mini-cell--align-${align}`}
    >
      {children}
    </div>
  );
}

function SplitLabelStack({
  labels,
  compact = false,
}: {
  labels: { text: string; tone?: 'default' | 'total' | 'muted' }[];
  compact?: boolean;
}) {
  return (
    <div
      className={`analytics-revenue-fee-split-stack analytics-revenue-fee-split-stack--labels${compact ? ' analytics-revenue-fee-split-stack--compact' : ''}`}
    >
      {labels.map((label) => (
        <SplitMiniCell key={label.text} tone={label.tone ?? 'muted'} align="right">
          <Text
            type={label.tone === 'muted' || label.tone === 'default' ? 'secondary' : undefined}
            strong={label.tone === 'total'}
            className="analytics-revenue-fee-split-mini-cell__text"
          >
            {label.text}
          </Text>
        </SplitMiniCell>
      ))}
    </div>
  );
}

function SplitAmountStack({
  amounts,
  muted = false,
  compact = false,
}: {
  amounts: { text: string; tone?: 'default' | 'total' | 'muted' }[];
  muted?: boolean;
  compact?: boolean;
}) {
  const textTone = muted ? 'secondary' : undefined;

  return (
    <div
      className={`analytics-revenue-fee-split-stack analytics-revenue-fee-split-stack--amounts${compact ? ' analytics-revenue-fee-split-stack--compact' : ''}`}
    >
      {amounts.map((amount, index) => (
        <SplitMiniCell key={`${amount.text}-${index}`} tone={amount.tone ?? 'muted'} align="right">
          <Text
            type={amount.tone === 'total' && !muted ? textTone : 'secondary'}
            strong={amount.tone === 'total' && !muted}
            className="analytics-revenue-fee-split-mini-cell__text"
          >
            {amount.text}
          </Text>
        </SplitMiniCell>
      ))}
    </div>
  );
}

/** Figure-2 layout: entity name + bordered Total / Equity / Cash label cells. */
export function ServiceFeeBreakdownSplitName({
  name,
  nameIndent = 72,
  ...props
}: ServiceFeeBreakdownProps & { name: string; nameIndent?: number }) {
  const resolved = resolveFeeBreakdown(props);

  if (resolved.empty || resolved.revenueOnly) {
    return (
      <Text type="secondary" style={{ display: 'block', paddingLeft: nameIndent, fontSize: 13 }}>
        {name}
      </Text>
    );
  }

  if (resolved.eorProject) {
    return (
      <div
        className="analytics-revenue-fee-split-panel analytics-revenue-fee-split-panel--compact"
        style={{ paddingLeft: nameIndent }}
      >
        <div className="analytics-revenue-fee-split-panel__entity">
          <Text type="secondary" className="analytics-revenue-fee-split-panel__entity-text">
            {name}
          </Text>
        </div>
        <SplitLabelStack compact labels={[{ text: SERVICE_FEE_LINE_LABEL, tone: 'muted' }]} />
      </div>
    );
  }

  return (
    <div className="analytics-revenue-fee-split-panel" style={{ paddingLeft: nameIndent }}>
      <div className="analytics-revenue-fee-split-panel__entity">
        <Text type="secondary" className="analytics-revenue-fee-split-panel__entity-text">
          {name}
        </Text>
      </div>
      <SplitLabelStack
        labels={[
          { text: TOTAL_LINE_LABEL, tone: 'total' },
          { text: FEE_BREAKDOWN_LINE_LABELS.equity, tone: 'muted' },
          { text: FEE_BREAKDOWN_LINE_LABELS.cash, tone: 'muted' },
        ]}
      />
    </div>
  );
}

/** Figure-2 layout: bordered amount cells aligned to label rows. */
export function ServiceFeeBreakdownSplitAmounts({
  muted = false,
  ...props
}: ServiceFeeBreakdownProps) {
  const resolved = resolveFeeBreakdown(props);

  if (resolved.empty) {
    return <Text type="secondary">-</Text>;
  }

  if (resolved.revenueOnly) {
    return (
      <Text strong={!muted} type={muted ? 'secondary' : undefined}>
        {formatMoneyValue(resolved.fee.serviceFeeTotal)}
      </Text>
    );
  }

  if (resolved.eorProject) {
    return (
      <SplitAmountStack
        compact
        muted={muted}
        amounts={[{ text: formatMoneyValue(resolved.fee.serviceFeeTotal), tone: 'muted' }]}
      />
    );
  }

  return (
    <SplitAmountStack
      muted={muted}
      amounts={[
        { text: formatMoneyValue(resolved.fee.serviceFeeTotal), tone: 'total' },
        { text: moneyShort(resolved.fee.equity), tone: 'muted' },
        { text: moneyShort(resolved.fee.cash), tone: 'muted' },
      ]}
    />
  );
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

/** Inline label + amount grid (legacy compact cell). */
export function ServiceFeeBreakdownCell(props: ServiceFeeBreakdownProps) {
  const { muted = false } = props;
  const resolved = resolveFeeBreakdown(props);
  const tone = muted ? 'secondary' : undefined;

  if (resolved.empty) {
    return <Text type="secondary">-</Text>;
  }

  if (resolved.revenueOnly) {
    return (
      <Text strong={!muted} type={tone}>
        {formatMoneyValue(resolved.fee.serviceFeeTotal)}
      </Text>
    );
  }

  if (resolved.eorProject) {
    return (
      <div className="analytics-revenue-fee-cell analytics-revenue-fee-cell--eor-only">
        <FeeCellPartRow label={SERVICE_FEE_LINE_LABEL} amount={formatMoneyValue(resolved.fee.serviceFeeTotal)} />
      </div>
    );
  }

  return (
    <div className="analytics-revenue-fee-cell">
      <Text strong={!muted} type={tone} className="analytics-revenue-fee-cell__total">
        {formatMoneyValue(resolved.fee.serviceFeeTotal)}
      </Text>
      <FeeCellPartRow label={FEE_BREAKDOWN_LINE_LABELS.equity} amount={moneyShort(resolved.fee.equity)} />
      <FeeCellPartRow label={FEE_BREAKDOWN_LINE_LABELS.cash} amount={moneyShort(resolved.fee.cash)} />
    </div>
  );
}
