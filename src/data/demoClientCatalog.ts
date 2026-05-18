import {
  CHART_BROWN,
  CHART_GREEN,
  CHART_PURPLE,
  CHART_RED,
} from '../constants/chartColors';
import type { DemoRepKey } from './analyticsDemoSeries';

export type DemoClientId =
  | 'acme'
  | 'apex'
  | 'flint'
  | 'glacier'
  | 'harbor'
  | 'globex'
  | 'bolt'
  | 'edge'
  | 'ion'
  | 'jade'
  | 'initech'
  | 'core'
  | 'keystone'
  | 'lumen'
  | 'mosaic'
  | 'umbrella'
  | 'dusk'
  | 'nova'
  | 'orbit'
  | 'prism';

export type DemoClientDef = {
  id: DemoClientId;
  name: string;
  owner: DemoRepKey;
  weight: number;
  color: string;
};

/** Twenty demo clients — five per sales rep. */
export const DEMO_CLIENT_CATALOG: DemoClientDef[] = [
  { id: 'acme', name: 'Acme Corp · ERP rollout', owner: 'alice', weight: 0.24, color: CHART_PURPLE },
  { id: 'apex', name: 'Client Apex', owner: 'alice', weight: 0.2, color: '#9B7EF5' },
  { id: 'flint', name: 'Client Flint', owner: 'alice', weight: 0.19, color: '#B89CF8' },
  { id: 'glacier', name: 'Client Glacier', owner: 'alice', weight: 0.19, color: '#A78BFA' },
  { id: 'harbor', name: 'Client Harbor', owner: 'alice', weight: 0.18, color: '#C4B5FD' },
  { id: 'globex', name: 'Globex · Data platform', owner: 'bob', weight: 0.24, color: CHART_GREEN },
  { id: 'bolt', name: 'Client Bolt', owner: 'bob', weight: 0.2, color: '#5CD69A' },
  { id: 'edge', name: 'Client Edge', owner: 'bob', weight: 0.19, color: '#3DB87E' },
  { id: 'ion', name: 'Client Ion', owner: 'bob', weight: 0.19, color: '#6FE0AD' },
  { id: 'jade', name: 'Client Jade', owner: 'bob', weight: 0.18, color: '#4ACC8A' },
  { id: 'initech', name: 'Initech · Billing integration', owner: 'carol', weight: 0.24, color: CHART_RED },
  { id: 'core', name: 'Client Core', owner: 'carol', weight: 0.2, color: '#F0B429' },
  { id: 'keystone', name: 'Client Keystone', owner: 'carol', weight: 0.19, color: '#E5A817' },
  { id: 'lumen', name: 'Client Lumen', owner: 'carol', weight: 0.19, color: '#F5C451' },
  { id: 'mosaic', name: 'Client Mosaic', owner: 'carol', weight: 0.18, color: '#D99B12' },
  { id: 'umbrella', name: 'Umbrella · Mobile app', owner: 'david', weight: 0.24, color: CHART_BROWN },
  { id: 'dusk', name: 'Client Dusk', owner: 'david', weight: 0.2, color: '#6CB4FF' },
  { id: 'nova', name: 'Client Nova', owner: 'david', weight: 0.19, color: '#5AA3F5' },
  { id: 'orbit', name: 'Client Orbit', owner: 'david', weight: 0.19, color: '#7EC3FF' },
  { id: 'prism', name: 'Client Prism', owner: 'david', weight: 0.18, color: '#4F9AE8' },
];

export const DEMO_CLIENT_IDS = DEMO_CLIENT_CATALOG.map((c) => c.id);

export const DEMO_CLIENT_OWNER = Object.fromEntries(
  DEMO_CLIENT_CATALOG.map((c) => [c.id, c.owner]),
) as Record<DemoClientId, DemoRepKey>;

/** Toolbar / fee-profile clients (subset of the catalog). */
export const TOOLBAR_CLIENT_IDS = ['acme', 'globex', 'initech', 'umbrella'] as const satisfies readonly DemoClientId[];

export type ToolbarClientId = (typeof TOOLBAR_CLIENT_IDS)[number];

const REP_KEYS: DemoRepKey[] = ['alice', 'bob', 'carol', 'david'];

export function buildClientMonthlyFromReps(
  byRep: Record<DemoRepKey, number[]>,
  periodCount: number,
): Record<DemoClientId, number[]> {
  const out = Object.fromEntries(DEMO_CLIENT_IDS.map((id) => [id, Array<number>(periodCount).fill(0)])) as Record<
    DemoClientId,
    number[]
  >;

  for (const rep of REP_KEYS) {
    const clients = DEMO_CLIENT_CATALOG.filter((c) => c.owner === rep);
    const weightSum = clients.reduce((s, c) => s + c.weight, 0);

    for (let mi = 0; mi < periodCount; mi++) {
      const repAmount = byRep[rep][mi] ?? 0;
      let remaining = repAmount;

      clients.forEach((client, index) => {
        const isLast = index === clients.length - 1;
        const share = isLast
          ? remaining
          : Math.round((repAmount * client.weight) / weightSum);
        remaining -= share;
        out[client.id][mi] += share;
      });
    }
  }

  return out;
}

/** Rank positions (#3, #4, …) shown with a declining trend in the client rank list (demo only). */
export const DEMO_DECLINING_CLIENT_RANKS = new Set([3, 4, 10, 16, 17]);

/** Reshape a period slice so revenue clearly falls from first to last month (for demo visuals). */
export function shapeDecliningClientSeries(series: readonly number[]): number[] {
  if (series.length < 2) return [...series];

  const lastIndex = series.length - 1;
  const anchor = Math.max(...series, series[0] ?? 0, 50);
  const start = Math.round(anchor * 1.1);
  const end = Math.round(anchor * 0.7);

  return series.map((value, index) => {
    const t = index / lastIndex;
    const baseline = start + (end - start) * t;
    const wiggle = Math.round((value - anchor) * 0.1 * (1 - t));
    return Math.max(50, Math.round(baseline + wiggle));
  });
}

export function computeRangeChangePct(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return last > 0 ? 100 : 0;
  return Math.round(((last - first) / first) * 1000) / 10;
}

export function formatTotalShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = Math.round((abs / 1_000_000) * 10) / 10;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}m`;
  }
  if (abs >= 1000) {
    const k = Math.round((abs / 1000) * 10) / 10;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${abs.toLocaleString('en-US')}`;
}
