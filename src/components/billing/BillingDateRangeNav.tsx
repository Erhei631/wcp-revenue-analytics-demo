import { LeftOutlined, RightOutlined } from '@ant-design/icons';

type BillingDateRangeNavProps = {
  label: string;
  onShiftEarlier?: () => void;
  onShiftLater?: () => void;
  onOpenPicker?: () => void;
};

export function BillingDateRangeNav({
  label,
  onShiftEarlier,
  onShiftLater,
  onOpenPicker,
}: BillingDateRangeNavProps) {
  return (
    <div className="billing-date-nav" aria-label="Date range">
      <button
        type="button"
        className="billing-date-nav__outer"
        aria-label="Previous period"
        onClick={onShiftEarlier}
      >
        <LeftOutlined />
      </button>

      <button type="button" className="billing-date-nav__label" onClick={onOpenPicker}>
        <span className="billing-date-nav__text">{label}</span>
      </button>

      <button
        type="button"
        className="billing-date-nav__outer"
        aria-label="Next period"
        onClick={onShiftLater}
      >
        <RightOutlined />
      </button>
    </div>
  );
}
