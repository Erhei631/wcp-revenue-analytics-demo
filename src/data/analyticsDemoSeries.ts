import dayjs, { type Dayjs } from 'dayjs';

/** Latest month included in demo analytics (inclusive). */
export const REPORTING_END = dayjs('2026-05-01');

const DEMO_RANGE_START = dayjs('2025-01-01');

export const DEMO_REP_KEYS = ['alice', 'bob', 'carol', 'david'] as const;
export type DemoRepKey = (typeof DEMO_REP_KEYS)[number];

function buildDemoMonthRange(start: Dayjs, end: Dayjs): Dayjs[] {
  const months: Dayjs[] = [];
  let cursor = start.startOf('month');
  const last = end.startOf('month');
  while (cursor.isBefore(last) || cursor.isSame(last, 'month')) {
    months.push(cursor);
    cursor = cursor.add(1, 'month');
  }
  return months;
}

/** Jan 2025 – May 2026 (reporting end), inclusive. */
export const DEMO_MONTHS = buildDemoMonthRange(DEMO_RANGE_START, REPORTING_END);

export const DEMO_MONTH_COUNT = DEMO_MONTHS.length;

export const DEMO_PERIOD_LABELS = DEMO_MONTHS.map((m) => m.format('MMM YY')) as readonly string[];

/** Jan–May 2026 monthly revenue per rep (anchors the 2026 YTD slice). */
const ANCHOR_2026_MONTHLY: Record<DemoRepKey, readonly [number, number, number, number, number]> = {
  alice: [12_200, 15_800, 11_400, 18_600, 21_000],
  bob: [8_400, 9_200, 11_800, 10_200, 13_500],
  carol: [5_100, 6_800, 7_200, 8_900, 6_400],
  david: [3_200, 4_100, 5_800, 4_600, 7_200],
};

function repMonthNoise(rep: DemoRepKey, month: Dayjs): number {
  const seed = (rep.charCodeAt(0) + rep.charCodeAt(rep.length - 1)) * 31 + month.year() * 12 + month.month();
  return ((seed * 11_371) % 10_007) / 10_007 - 0.5;
}

function monthTemplate(rep: DemoRepKey, month: Dayjs): number {
  const anchor = ANCHOR_2026_MONTHLY[rep];
  if (month.year() === 2026 && month.month() >= 0 && month.month() < anchor.length) {
    return anchor[month.month()] ?? 0;
  }
  // Prior-year months use the same seasonal shape (Jan–May anchor slots).
  const slot = Math.min(month.month(), anchor.length - 1);
  return anchor[slot] ?? 0;
}

function valueForMonth(rep: DemoRepKey, month: Dayjs): number {
  const template = monthTemplate(rep, month);
  if (!Number.isFinite(template) || template === 0) return 0;

  if (month.year() === 2026) {
    return template;
  }

  const progress = month.month() / 11;
  const yoyFactor = 0.84 + progress * 0.1;
  const jitter = 1 + repMonthNoise(rep, month) * 0.05;
  const value = Math.round(template * yoyFactor * jitter);
  return Number.isFinite(value) ? value : 0;
}

/** Full monthly revenue series for one sales rep across the demo calendar. */
export function buildRepMonthlySeries(rep: DemoRepKey): number[] {
  return DEMO_MONTHS.map((month) => valueForMonth(rep, month));
}

export function buildAllRepMonthlySeries(): Record<DemoRepKey, number[]> {
  return Object.fromEntries(DEMO_REP_KEYS.map((rep) => [rep, buildRepMonthlySeries(rep)])) as Record<
    DemoRepKey,
    number[]
  >;
}
