import { DEMO_MONTHS, DEMO_MONTH_COUNT, type DemoRepKey } from './analyticsDemoSeries';

/** Standard month hours used to express presale effort as FTE-months. */
export const PRESALE_HOURS_DIVISOR = 168;

function presaleHoursForMonth(rep: DemoRepKey, monthIndex: number): number {
  const month = DEMO_MONTHS[monthIndex];
  if (!month) return 0;

  const seed = rep.charCodeAt(0) * 17 + month.year() * 12 + month.month();
  const anchor =
    rep === 'alice' ? 36 : rep === 'bob' ? 28 : rep === 'carol' ? 22 : 18;
  const seasonal = month.month() % 3 === 0 ? 6 : 0;
  const jitter = (seed % 9) - 4;
  return Math.max(0, anchor + seasonal + jitter);
}

/** Monthly hours logged on the presale project, per sales rep (demo). */
export const PRESALE_MONTHLY_HOURS_BY_REP: Record<DemoRepKey, readonly number[]> = {
  alice: Array.from({ length: DEMO_MONTH_COUNT }, (_, i) => presaleHoursForMonth('alice', i)),
  bob: Array.from({ length: DEMO_MONTH_COUNT }, (_, i) => presaleHoursForMonth('bob', i)),
  carol: Array.from({ length: DEMO_MONTH_COUNT }, (_, i) => presaleHoursForMonth('carol', i)),
  david: Array.from({ length: DEMO_MONTH_COUNT }, (_, i) => presaleHoursForMonth('david', i)),
};

export function sumPresaleHours(
  monthIndices: readonly number[],
  salesKeys: readonly DemoRepKey[],
): number {
  let total = 0;
  for (const key of salesKeys) {
    const series = PRESALE_MONTHLY_HOURS_BY_REP[key];
    for (const i of monthIndices) {
      total += series[i] ?? 0;
    }
  }
  return total;
}

export function presaleEffortFromHours(totalHours: number): number {
  if (totalHours <= 0) return 0;
  return totalHours / PRESALE_HOURS_DIVISOR;
}
