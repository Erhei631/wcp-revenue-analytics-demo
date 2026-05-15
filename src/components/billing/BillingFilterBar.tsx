import { useState } from 'react';
import { CaretDownFilled, QuestionCircleOutlined } from '@ant-design/icons';
import { Select, Typography } from 'antd';
import { BillingDateRangeNav } from './BillingDateRangeNav';

const { Link: TextLink } = Typography;

export type BillingPeriodPreset = '6mo' | 'year';

type BillingFilterBarProps = {
  dateRangeLabel: string;
  periodPreset?: BillingPeriodPreset;
  onPeriodPresetChange?: (preset: BillingPeriodPreset) => void;
};

const pillSuffix = (
  <CaretDownFilled style={{ fontSize: 9, color: '#262626', display: 'block' }} />
);

export function BillingFilterBar({
  dateRangeLabel,
  periodPreset: periodPresetProp,
  onPeriodPresetChange,
}: BillingFilterBarProps) {
  const [periodInternal, setPeriodInternal] = useState<BillingPeriodPreset>('6mo');
  const periodPreset = periodPresetProp ?? periodInternal;

  const setPeriod = (next: BillingPeriodPreset) => {
    setPeriodInternal(next);
    onPeriodPresetChange?.(next);
  };

  return (
    <div className="billing-filter-bar">
      <div className="billing-filter-bar__row billing-filter-bar__row--primary">
        <BillingDateRangeNav label={dateRangeLabel} />
        <div className="billing-period-toggle" role="group" aria-label="Time period">
          <button
            type="button"
            className={
              periodPreset === '6mo'
                ? 'billing-period-toggle__btn billing-period-toggle__btn--active'
                : 'billing-period-toggle__btn'
            }
            onClick={() => setPeriod('6mo')}
          >
            6 Mo
          </button>
          <button
            type="button"
            className={
              periodPreset === 'year'
                ? 'billing-period-toggle__btn billing-period-toggle__btn--active'
                : 'billing-period-toggle__btn'
            }
            onClick={() => setPeriod('year')}
          >
            Year
          </button>
        </div>
        <Select
          className="analytics-toolbar-select"
          defaultValue="all"
          options={[{ value: 'all', label: 'All Client & Projects' }]}
          suffixIcon={pillSuffix}
          popupMatchSelectWidth={false}
        />
        <Select
          className="analytics-toolbar-select"
          defaultValue="all"
          options={[{ value: 'all', label: 'All Sales' }]}
          suffixIcon={pillSuffix}
          popupMatchSelectWidth={false}
        />
        <Select
          className="analytics-toolbar-select"
          defaultValue="all"
          options={[{ value: 'all', label: 'All Status' }]}
          suffixIcon={pillSuffix}
          popupMatchSelectWidth={false}
        />
        <div className="billing-filter-bar__spacer" />
        <div className="billing-filter-bar__status-color">
          <QuestionCircleOutlined className="billing-filter-bar__status-icon" />
          <TextLink className="billing-filter-bar__status-link">Status Color</TextLink>
        </div>
      </div>
    </div>
  );
}
