import type { ReactNode } from 'react';
import { Tooltip } from 'antd';

export type AnalyticsStatValueBreakdown = {
  paid: number;
  unpaid: number;
};

export type AnalyticsStatItem = {
  key: string;
  title: string;
  value: ReactNode;
  /** Hovering the value shows a Paid / Unpaid breakdown tooltip. */
  valueBreakdown?: AnalyticsStatValueBreakdown;
  avatar?: ReactNode;
  /** Full label shown on hover when the visible value is abbreviated (e.g. person name). */
  valueTitle?: string;
  valueVariant?: 'metric' | 'person';
  unit?: string;
  note?: ReactNode;
  rightLabel?: string;
  rightLabelTone?: 'default' | 'positive';
};

type AnalyticsStatBarProps = {
  items: AnalyticsStatItem[];
};

function formatBreakdownMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatBreakdownTooltip({ paid, unpaid }: AnalyticsStatValueBreakdown) {
  return (
    <div className="analytics-stat-bar__breakdown-tooltip">
      <div className="analytics-stat-bar__breakdown-tooltip-inner">
        <div className="analytics-stat-bar__breakdown-row">
          <span>Paid:</span>
          <strong>{formatBreakdownMoney(paid)}</strong>
        </div>
        <div className="analytics-stat-bar__breakdown-divider" aria-hidden />
        <div className="analytics-stat-bar__breakdown-row">
          <span>Unpaid:</span>
          <strong>{formatBreakdownMoney(unpaid)}</strong>
        </div>
      </div>
    </div>
  );
}

function renderStatValue(item: AnalyticsStatItem) {
  const valueClassName =
    item.valueVariant === 'person'
      ? 'analytics-stat-bar__value analytics-stat-bar__value--person'
      : 'analytics-stat-bar__value';

  if (item.valueVariant === 'person' && item.valueTitle) {
    return (
      <Tooltip title={item.valueTitle}>
        <span className={valueClassName} tabIndex={0}>
          {item.value}
        </span>
      </Tooltip>
    );
  }

  if (item.valueBreakdown) {
    return (
      <Tooltip
        title={<StatBreakdownTooltip {...item.valueBreakdown} />}
        placement="right"
        arrow={{ pointAtCenter: true }}
        overlayClassName="analytics-stat-bar-cash-tooltip"
        styles={{ body: { padding: 0, background: 'transparent', boxShadow: 'none' } }}
      >
        <span className={`${valueClassName} analytics-stat-bar__value--breakdown`} tabIndex={0}>
          {item.value}
        </span>
      </Tooltip>
    );
  }

  return <span className={valueClassName}>{item.value}</span>;
}

function StatSection({ item, index }: { item: AnalyticsStatItem; index: number }) {
  return (
    <div className="analytics-stat-bar__section-wrap">
      <section className="analytics-stat-bar__section">
        {index > 0 ? <div className="analytics-stat-bar__divider" aria-hidden /> : null}
        <div className="analytics-stat-bar__title">
          <span>{item.title}</span>
        </div>
        <div className="analytics-stat-bar__note">{item.note ?? ''}</div>
        <div className="analytics-stat-bar__content">
          <div
            className={
              item.avatar
                ? 'analytics-stat-bar__value-wrap analytics-stat-bar__value-wrap--person'
                : 'analytics-stat-bar__value-wrap'
            }
          >
            {item.avatar ? <span className="analytics-stat-bar__avatar">{item.avatar}</span> : null}
            {renderStatValue(item)}
            {item.unit ? <span className="analytics-stat-bar__unit">{item.unit}</span> : null}
          </div>
          {item.rightLabel ? (
            <span
              className={
                item.rightLabelTone === 'positive'
                  ? 'analytics-stat-bar__right-label analytics-stat-bar__right-label--positive'
                  : 'analytics-stat-bar__right-label'
              }
            >
              {item.rightLabel}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function AnalyticsStatBar({ items }: AnalyticsStatBarProps) {
  return (
    <div className="analytics-stat-bar">
      {items.map((item, index) => (
        <StatSection key={item.key} item={item} index={index} />
      ))}
    </div>
  );
}
