import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Popover, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { THEME_PRIMARY, THEME_PRIMARY_MUTED, THEME_PRIMARY_SOFT } from '../constants/chartColors';

const { Text } = Typography;

export type MonthRangeValue = {
  start: Dayjs;
  end: Dayjs;
};

export type QuickPresetKey = 'last3' | 'ytd' | 'last6' | 'last12' | 'lastYear';

type MonthRangePickerProps = {
  value: MonthRangeValue;
  onChange: (value: MonthRangeValue, preset?: QuickPresetKey) => void;
  activePreset?: QuickPresetKey | null;
  referenceDate?: Dayjs;
  style?: CSSProperties;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const QUICK_PRESETS: { key: QuickPresetKey; label: string }[] = [
  { key: 'last3', label: 'Last 3 months' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'last6', label: 'Last 6 months' },
  { key: 'last12', label: 'Last 12 months' },
  { key: 'lastYear', label: 'Last year' },
];

const chevronNavBtnStyle: CSSProperties = {
  width: 24,
  height: 24,
  flexShrink: 0,
  border: '1px solid #e8e8e8',
  borderRadius: 8,
  background: '#fff',
  color: '#595959',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  padding: 0,
};

function monthKey(d: Dayjs) {
  return d.year() * 12 + d.month();
}

function clampMonth(d: Dayjs) {
  return d.startOf('month');
}

/** e.g. "Dec, 2025 - May, 2026" — matches dashboard filter bar reference */
export function formatMonthRangeDisplayLabel(range: MonthRangeValue) {
  return `${range.start.format('MMM, YYYY')} - ${range.end.format('MMM, YYYY')}`;
}

/** Shorter label for summary lines (e.g. under the toolbar). */
export function formatMonthRangeLabel(range: MonthRangeValue) {
  const sameYear = range.start.year() === range.end.year();
  const start = range.start.format('MMM YYYY');
  const end = sameYear ? range.end.format('MMM') : range.end.format('MMM YYYY');
  return `${start} – ${end}`;
}

export function shiftMonthRangeBy(value: MonthRangeValue, deltaMonths: number): MonthRangeValue {
  return {
    start: value.start.add(deltaMonths, 'month').startOf('month'),
    end: value.end.add(deltaMonths, 'month').startOf('month'),
  };
}

export function resolveMonthPreset(preset: QuickPresetKey, ref: Dayjs): MonthRangeValue {
  const end = clampMonth(ref);
  switch (preset) {
    case 'last3':
      return { start: end.subtract(2, 'month'), end };
    case 'ytd':
      return { start: end.startOf('year'), end };
    case 'last6':
      return { start: end.subtract(5, 'month'), end };
    case 'last12':
      return { start: end.subtract(11, 'month'), end };
    case 'lastYear': {
      const year = end.year() - 1;
      return {
        start: dayjs().year(year).month(0).startOf('month'),
        end: dayjs().year(year).month(11).startOf('month'),
      };
    }
    default:
      return { start: end.startOf('year'), end };
  }
}

function orderedRange(a: Dayjs, b: Dayjs): MonthRangeValue {
  return monthKey(a) <= monthKey(b) ? { start: a, end: b } : { start: b, end: a };
}

function isSameMonth(a: Dayjs, b: Dayjs) {
  return a.year() === b.year() && a.month() === b.month();
}

function isInRange(month: Dayjs, range: MonthRangeValue | null) {
  if (!range) return false;
  const key = monthKey(month);
  return key >= monthKey(range.start) && key <= monthKey(range.end);
}

function isRangeStart(month: Dayjs, range: MonthRangeValue | null) {
  return range ? isSameMonth(month, range.start) : false;
}

function isRangeEnd(month: Dayjs, range: MonthRangeValue | null) {
  return range ? isSameMonth(month, range.end) : false;
}

type MonthCellProps = {
  month: Dayjs;
  draft: MonthRangeValue | null;
  onPick: (month: Dayjs) => void;
};

function MonthCell({ month, draft, onPick }: MonthCellProps) {
  const inRange = isInRange(month, draft);
  const isStart = isRangeStart(month, draft);
  const isEnd = isRangeEnd(month, draft);
  const isEndpoint = isStart || isEnd;

  let background = 'transparent';
  let color = '#8c8c8c';
  let fontWeight: number | undefined;

  if (isEndpoint) {
    background = THEME_PRIMARY;
    color = '#fff';
    fontWeight = 600;
  } else if (inRange) {
    background = THEME_PRIMARY_SOFT;
    color = THEME_PRIMARY;
    fontWeight = 500;
  }

  return (
    <button
      type="button"
      onClick={() => onPick(month)}
      style={{
        border: 'none',
        background,
        color,
        fontWeight,
        fontSize: 13,
        lineHeight: '32px',
        borderRadius: 8,
        cursor: 'pointer',
        padding: 0,
        width: '100%',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {MONTHS[month.month()]}
    </button>
  );
}

type YearPanelProps = {
  year: number;
  draft: MonthRangeValue | null;
  onPick: (month: Dayjs) => void;
  onYearShift: (delta: number) => void;
  showLeftNav?: boolean;
  showRightNav?: boolean;
};

function YearPanel({ year, draft, onPick, onYearShift, showLeftNav, showRightNav }: YearPanelProps) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '4px 12px 12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          gap: 8,
        }}
      >
        {showLeftNav ? (
          <button type="button" aria-label="Previous years" style={chevronNavBtnStyle} onClick={() => onYearShift(-1)}>
            «
          </button>
        ) : (
          <span style={{ width: 28 }} />
        )}
        <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
          {year}
        </Text>
        {showRightNav ? (
          <button type="button" aria-label="Next years" style={chevronNavBtnStyle} onClick={() => onYearShift(1)}>
            »
          </button>
        ) : (
          <span style={{ width: 28 }} />
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}
      >
        {MONTHS.map((_, monthIndex) => (
          <MonthCell
            key={monthIndex}
            month={dayjs().year(year).month(monthIndex).startOf('month')}
            draft={draft}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}

export function MonthRangePicker({
  value,
  onChange,
  activePreset = null,
  referenceDate,
  style,
}: MonthRangePickerProps) {
  const refDate = referenceDate ?? dayjs('2026-05-01');
  const [open, setOpen] = useState(false);
  const [leftYear, setLeftYear] = useState(value.start.year());
  const [draft, setDraft] = useState<MonthRangeValue | null>(null);
  const [anchor, setAnchor] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setAnchor(null);
      setLeftYear(value.start.year());
    }
  }, [open, value]);

  const displayLabel = useMemo(() => formatMonthRangeDisplayLabel(value), [value]);

  const bumpRange = (delta: number) => {
    onChange(shiftMonthRangeBy(value, delta));
  };

  const handlePick = (month: Dayjs) => {
    const picked = clampMonth(month);
    if (!anchor) {
      setAnchor(picked);
      setDraft({ start: picked, end: picked });
      return;
    }
    const next = orderedRange(anchor, picked);
    setDraft(next);
    setAnchor(null);
    onChange(next);
    setOpen(false);
  };

  const handlePreset = (preset: QuickPresetKey) => {
    const next = resolveMonthPreset(preset, refDate);
    setDraft(next);
    setAnchor(null);
    onChange(next, preset);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && anchor) {
      const single = { start: anchor, end: anchor };
      setDraft(single);
      setAnchor(null);
      onChange(single);
    }
    setOpen(nextOpen);
  };

  const panel = (
    <div style={{ display: 'flex', width: 620, maxWidth: '92vw' }}>
      <div
        style={{
          width: 168,
          flexShrink: 0,
          borderRight: '1px solid #f0f0f0',
          padding: '12px 8px 12px 12px',
        }}
      >
        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8, paddingLeft: 10 }}>
          Quick select
        </Text>
        {QUICK_PRESETS.map((preset) => {
          const selected = activePreset === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => handlePreset(preset.key)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                borderRadius: 8,
                padding: '8px 10px',
                marginBottom: 2,
                cursor: 'pointer',
                fontSize: 13,
                background: selected ? THEME_PRIMARY_MUTED : 'transparent',
                color: selected ? THEME_PRIMARY : '#595959',
                fontWeight: selected ? 600 : 400,
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <YearPanel
          year={leftYear}
          draft={draft}
          onPick={handlePick}
          onYearShift={(delta) => setLeftYear((y) => y + delta)}
          showLeftNav
        />
        <YearPanel
          year={leftYear + 1}
          draft={draft}
          onPick={handlePick}
          onYearShift={(delta) => setLeftYear((y) => y + delta)}
          showRightNav
        />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexShrink: 0, ...style }}>
      <button
        type="button"
        aria-label="Shift range earlier"
        onClick={() => bumpRange(-1)}
        style={chevronNavBtnStyle}
      >
        <LeftOutlined />
      </button>
      <Popover
        open={open}
        onOpenChange={handleOpenChange}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        content={panel}
        overlayInnerStyle={{
          padding: 0,
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <button
          type="button"
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
            fontSize: 14,
            color: '#595959',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          {displayLabel}
        </button>
      </Popover>
      <button
        type="button"
        aria-label="Shift range later"
        onClick={() => bumpRange(1)}
        style={chevronNavBtnStyle}
      >
        <RightOutlined />
      </button>
    </div>
  );
}
