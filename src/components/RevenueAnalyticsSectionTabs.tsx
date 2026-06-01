export type RevenueAnalyticsSection = 'revenue-analytic' | 'eor-billing';

const TABS: { key: RevenueAnalyticsSection; label: string }[] = [
  { key: 'revenue-analytic', label: 'Revenue Analytic' },
  { key: 'eor-billing', label: 'EOR Billing' },
];

type RevenueAnalyticsSectionTabsProps = {
  value: RevenueAnalyticsSection;
  onChange: (value: RevenueAnalyticsSection) => void;
};

export function RevenueAnalyticsSectionTabs({
  value,
  onChange,
}: RevenueAnalyticsSectionTabsProps) {
  return (
    <div className="revenue-analytics-section-tabs" role="tablist" aria-label="Analytics section">
      {TABS.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={
              active
                ? 'revenue-analytics-section-tabs__btn revenue-analytics-section-tabs__btn--active'
                : 'revenue-analytics-section-tabs__btn'
            }
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
