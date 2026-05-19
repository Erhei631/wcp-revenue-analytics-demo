import type { ReactNode } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

export type AnalyticsStatItem = {
  key: string;
  title: string;
  /** Tooltip shown when hovering the info icon beside the title. */
  titleInfo?: ReactNode;
  value: ReactNode;
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

export function AnalyticsStatBar({ items }: AnalyticsStatBarProps) {
  return (
    <div className="analytics-stat-bar">
      {items.map((item, index) => (
        <section className="analytics-stat-bar__section" key={item.key}>
          {index > 0 ? <div className="analytics-stat-bar__divider" aria-hidden /> : null}
          <div className="analytics-stat-bar__title">
            <span>{item.title}</span>
            {item.titleInfo ? (
              <Tooltip title={item.titleInfo}>
                <InfoCircleOutlined className="analytics-stat-bar__title-info" tabIndex={0} />
              </Tooltip>
            ) : null}
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
