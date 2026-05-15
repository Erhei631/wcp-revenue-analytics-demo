import type { ReactNode } from 'react';
import { Tooltip } from 'antd';

export type AnalyticsStatItem = {
  key: string;
  title: string;
  value: ReactNode;
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

export function AnalyticsStatBar({ items }: AnalyticsStatBarProps) {
  return (
    <div className="analytics-stat-bar">
      {items.map((item, index) => (
        <section className="analytics-stat-bar__section" key={item.key}>
          {index > 0 ? <div className="analytics-stat-bar__divider" aria-hidden /> : null}
          <div className="analytics-stat-bar__title">{item.title}</div>
          <div className="analytics-stat-bar__note">{item.note ?? ''}</div>
          <div className="analytics-stat-bar__content">
            <div className="analytics-stat-bar__value-wrap">
              {item.valueVariant === 'person' && item.valueTitle ? (
                <Tooltip title={item.valueTitle}>
                  <span
                    className="analytics-stat-bar__value analytics-stat-bar__value--person"
                    tabIndex={0}
                  >
                    {item.value}
                  </span>
                </Tooltip>
              ) : (
                <span
                  className={
                    item.valueVariant === 'person'
                      ? 'analytics-stat-bar__value analytics-stat-bar__value--person'
                      : 'analytics-stat-bar__value'
                  }
                >
                  {item.value}
                </span>
              )}
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
      ))}
    </div>
  );
}
