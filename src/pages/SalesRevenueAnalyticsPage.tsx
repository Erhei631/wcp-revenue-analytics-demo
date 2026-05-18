import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  message,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CaretDownFilled,
  CaretDownOutlined,
  CaretRightOutlined,
  DownloadOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LegendPayload } from 'recharts';
import {
  MonthRangePicker,
  formatMonthRangeLabel,
  resolveMonthPreset,
  type MonthRangeValue,
  type QuickPresetKey,
} from '../components/MonthRangePicker';
import { AnalyticsStatBar, type AnalyticsStatItem } from '../components/AnalyticsStatBar';
import { ClientCollectionChartCard } from '../components/ClientCollectionChartCard';
import {
  CHART_BROWN,
  CHART_BROWN_SOFT,
  CHART_GREEN,
  CHART_GREEN_SOFT,
  CHART_PURPLE,
  CHART_PURPLE_SOFT,
  CHART_RED,
  CHART_RED_SOFT,
  THEME_PRIMARY,
} from '../constants/chartColors';
import { DashboardShell } from '../layout/DashboardShell';

const { Text, Title } = Typography;

const REPORTING_END = dayjs('2026-05-01');

const DEMO_MONTHS: Dayjs[] = [
  dayjs('2026-01-01'),
  dayjs('2026-02-01'),
  dayjs('2026-03-01'),
  dayjs('2026-04-01'),
  dayjs('2026-05-01'),
];

const PERIODS = DEMO_MONTHS.map((m) => m.format('MMM YY')) as readonly string[];

const PRESET_LABELS: Record<QuickPresetKey, string> = {
  last3: 'Last 3 months',
  ytd: 'Year to date',
  last6: 'Last 6 months',
  last12: 'Last 12 months',
  lastYear: 'Last year',
};

const REP_DEFS = [
  { key: 'alice', name: 'Alice Chen', color: CHART_PURPLE, soft: CHART_PURPLE_SOFT },
  { key: 'bob', name: 'Bob Li', color: CHART_GREEN, soft: CHART_GREEN_SOFT },
  { key: 'carol', name: 'Carol Wang', color: CHART_RED, soft: CHART_RED_SOFT },
  { key: 'david', name: 'David Park', color: CHART_BROWN, soft: CHART_BROWN_SOFT },
] as const;

type RepKey = (typeof REP_DEFS)[number]['key'];

/** Empty array means all sales reps are included. */
export type SalesFilter = RepKey[];

const CLIENTS = [
  { id: 'acme', name: 'Acme Corp · ERP rollout' },
  { id: 'globex', name: 'Globex · Data platform' },
  { id: 'initech', name: 'Initech · Billing integration' },
  { id: 'umbrella', name: 'Umbrella · Mobile app' },
] as const;

type ClientId = (typeof CLIENTS)[number]['id'];

/** Empty array means all clients & projects are included. */
export type ClientFilter = ClientId[];

const CLIENT_IDS: ClientId[] = CLIENTS.map((c) => c.id);

/** One owning sales rep per client; revenue is 100% on that rep’s row for this client (demo share of their book). */
const CLIENT_OWNER: Record<ClientId, RepKey> = {
  acme: 'alice',
  globex: 'bob',
  initech: 'carol',
  umbrella: 'david',
};

const CLIENT_DEFS = CLIENTS.map((c) => {
  const owner = REP_DEFS.find((r) => r.key === CLIENT_OWNER[c.id]);
  return { key: c.id, name: c.name, color: owner?.color ?? CHART_PURPLE };
});

/** Portion of the owner’s posted monthly revenue attributed to this account (rest = other deals, not listed). */
const CLIENT_TAKE_OF_OWNER: Record<ClientId, number> = {
  acme: 0.58,
  globex: 0.62,
  initech: 0.55,
  umbrella: 0.52,
};

const REP_KEYS: RepKey[] = ['alice', 'bob', 'carol', 'david'];

const BREAKDOWN: Record<RepKey, readonly [number, number, number, number, number]> = {
  alice: [12_200, 15_800, 11_400, 18_600, 21_000],
  bob: [8400, 9200, 11_800, 10_200, 13_500],
  carol: [5100, 6800, 7200, 8900, 6400],
  david: [3200, 4100, 5800, 4600, 7200],
};

/** Demo analytics are sliced from a fixed monthly series by the selected month range. */
type BuiltView = {
  periods: string[];
  system: number[];
  byRep: Record<RepKey, number[]>;
  byClient: Record<ClientId, number[]>;
  bucket: 'month';
  rangeLabel: string;
  note?: string;
};

function normalizeMonthRange(range: MonthRangeValue): MonthRangeValue {
  const start = range.start.startOf('month');
  const end = range.end.startOf('month');
  return start.isAfter(end) ? { start: end, end: start } : { start, end };
}

function monthRangeFromKeys(startKey: string, endKey: string): MonthRangeValue {
  return normalizeMonthRange({
    start: dayjs(`${startKey}-01`),
    end: dayjs(`${endKey}-01`),
  });
}

function monthInRange(month: Dayjs, range: MonthRangeValue) {
  const normalized = normalizeMonthRange(range);
  const key = month.year() * 12 + month.month();
  const startKey = normalized.start.year() * 12 + normalized.start.month();
  const endKey = normalized.end.year() * 12 + normalized.end.month();
  return key >= startKey && key <= endKey;
}

function buildClientRepMonthlyExclusive(): Record<ClientId, Record<RepKey, number[]>> {
  const out = {} as Record<ClientId, Record<RepKey, number[]>>;
  for (const c of CLIENT_IDS) {
    out[c] = {
      alice: PERIODS.map(() => 0),
      bob: PERIODS.map(() => 0),
      carol: PERIODS.map(() => 0),
      david: PERIODS.map(() => 0),
    };
    const owner = CLIENT_OWNER[c];
    const take = CLIENT_TAKE_OF_OWNER[c];
    for (let mi = 0; mi < PERIODS.length; mi++) {
      out[c][owner][mi] = Math.round(BREAKDOWN[owner][mi] * take);
    }
  }
  return out;
}

const CLIENT_REP_MONTHLY = buildClientRepMonthlyExclusive();

function isAllClientsSelected(clientIds: ClientFilter) {
  return clientIds.length === 0 || clientIds.length === CLIENT_IDS.length;
}

function isAllSalesSelected(salesKeys: SalesFilter) {
  return salesKeys.length === 0 || salesKeys.length === REP_KEYS.length;
}

function monthlyByRepForClients(clientIds: ClientFilter): Record<RepKey, number[]> {
  if (isAllClientsSelected(clientIds)) {
    return Object.fromEntries(REP_KEYS.map((k) => [k, [...BREAKDOWN[k]]])) as Record<RepKey, number[]>;
  }

  const merged = Object.fromEntries(
    REP_KEYS.map((k) => [k, PERIODS.map(() => 0)]),
  ) as Record<RepKey, number[]>;

  for (const id of clientIds) {
    const slice = CLIENT_REP_MONTHLY[id];
    for (const k of REP_KEYS) {
      for (let i = 0; i < PERIODS.length; i++) {
        merged[k][i] += slice[k][i];
      }
    }
  }

  return merged;
}

function monthlyByClientForClients(clientIds: ClientFilter): Record<ClientId, number[]> {
  return Object.fromEntries(
    CLIENT_IDS.map((id) => {
      const slice = CLIENT_REP_MONTHLY[id];
      const values = PERIODS.map((_, i) => REP_KEYS.reduce((sum, k) => sum + slice[k][i], 0));
      if (isAllClientsSelected(clientIds) || clientIds.includes(id)) {
        return [id, values];
      }
      return [id, PERIODS.map(() => 0)];
    }),
  ) as Record<ClientId, number[]>;
}

function clientFilterNote(clientIds: ClientFilter): string | undefined {
  if (isAllClientsSelected(clientIds)) return undefined;
  const labels = clientIds.map((id) => CLIENTS.find((c) => c.id === id)?.name ?? id);
  return `Client / project: ${labels.join(', ')} (demo)`;
}

function formatClientScopeLabel(clientIds: ClientFilter): string | null {
  if (isAllClientsSelected(clientIds)) return null;
  const names = clientIds.map((id) => CLIENTS.find((c) => c.id === id)?.name ?? id);
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

function formatSalesFilterLabel(salesKeys: SalesFilter): string {
  if (isAllSalesSelected(salesKeys)) return 'All Sales';
  const names = salesKeys.map((key) => REP_DEFS.find((r) => r.key === key)?.name ?? key);
  return names.join(', ');
}

function applySalesScope(
  salesKeys: SalesFilter,
  byRep: Record<RepKey, number[]>,
  byClient: Record<ClientId, number[]>,
): { byRep: Record<RepKey, number[]>; byClient: Record<ClientId, number[]>; system: number[] } {
  const periodCount = byRep[REP_KEYS[0]]?.length ?? 0;
  if (isAllSalesSelected(salesKeys)) {
    return {
      byRep,
      byClient,
      system: Array.from({ length: periodCount }, (_, i) =>
        REP_KEYS.reduce((sum, key) => sum + (byRep[key][i] ?? 0), 0),
      ),
    };
  }

  const keys = new Set(salesKeys);
  const scopedByRep = Object.fromEntries(
    REP_KEYS.map((k) => [k, keys.has(k) ? byRep[k] : byRep[k].map(() => 0)]),
  ) as Record<RepKey, number[]>;
  const scopedByClient = Object.fromEntries(
    CLIENT_IDS.map((id) => [
      id,
      keys.has(CLIENT_OWNER[id]) ? byClient[id] : byClient[id].map(() => 0),
    ]),
  ) as Record<ClientId, number[]>;
  const system = Array.from({ length: periodCount }, (_, i) =>
    salesKeys.reduce((sum, key) => sum + (scopedByRep[key][i] ?? 0), 0),
  );

  return { byRep: scopedByRep, byClient: scopedByClient, system };
}

/** Build analytics view from demo monthly rows, filtered to toolbar month / client / sales scope. */
function buildResolvedView(
  range: MonthRangeValue,
  clientIds: ClientFilter,
  salesKeys: SalesFilter,
  rangeLabel: string,
): BuiltView {
  const monthly = monthlyByRepForClients(clientIds);
  const monthlyClients = monthlyByClientForClients(clientIds);
  const baseNote = clientFilterNote(clientIds);
  const indices = DEMO_MONTHS.map((month, i) => ({ month, i }))
    .filter(({ month }) => monthInRange(month, range))
    .map(({ i }) => i);

  const periods = indices.map((i) => PERIODS[i]);
  const byRep = Object.fromEntries(
    REP_KEYS.map((k) => [k, indices.map((i) => monthly[k][i])]),
  ) as Record<RepKey, number[]>;
  const byClient = Object.fromEntries(
    CLIENT_IDS.map((id) => [id, indices.map((i) => monthlyClients[id][i])]),
  ) as Record<ClientId, number[]>;
  const { byRep: scopedByRep, byClient: scopedByClient, system } = applySalesScope(
    salesKeys,
    byRep,
    byClient,
  );

  return {
    periods,
    system,
    byRep: scopedByRep,
    byClient: scopedByClient,
    bucket: 'month',
    rangeLabel,
    note: baseNote,
  };
}

function bucketLabel() {
  return 'Monthly';
}

function money(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}

function personDisplayName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return fullName;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function cellToCsv(value: ReactNode) {
  if (value == null || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsvFile(filename: string, rows: string[][]) {
  const content = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type RevenueBreakdownRow = {
  key: RepKey;
  name: string;
  color: string;
  values: number[];
  total: number;
};

type AnalyticsExportInput = {
  exportedAt: string;
  rangeLabel: string;
  monthRangeLabel: string;
  salesLabel: string;
  clientLabel: string;
  viewNote?: string;
  statItems: AnalyticsStatItem[];
  periods: string[];
  system: number[];
  totalTrend: { period: string; revenue: number }[];
  multiLine: Array<{ period: string } & Record<RepKey, number>>;
  multiLineClient: Array<{ period: string } & Record<ClientId, number>>;
  tableRows: RevenueBreakdownRow[];
  viewTotal: number;
  includeSystemTotal: boolean;
};

function buildAnalyticsExportRows(input: AnalyticsExportInput) {
  const rows: string[][] = [
    ['Sales Revenue Analytics Export'],
    ['Exported at', input.exportedAt],
    ['Date range', input.rangeLabel],
    ['Month range', input.monthRangeLabel],
    ['Sales filter', input.salesLabel],
    ['Client filter', input.clientLabel],
  ];

  if (input.viewNote) {
    rows.push(['Note', input.viewNote]);
  }

  rows.push(
    [],
    ['Summary'],
    ['Metric', 'Value', 'Note', 'Label'],
    ...input.statItems.map((item) => [
      item.title,
      cellToCsv(item.valueTitle ?? item.value),
      cellToCsv(item.note),
      item.rightLabel ?? '',
    ]),
    [],
    ['Total Revenue Trend'],
    ['Period', 'Revenue (USD)'],
    ...input.totalTrend.map((row) => [row.period, String(row.revenue)]),
    [],
    ['Individual Sales Trend'],
    ['Period', ...REP_DEFS.map((rep) => rep.name)],
    ...input.multiLine.map((row) => [
      row.period,
      ...REP_KEYS.map((key) => String(row[key])),
    ]),
    [],
    ['Individual Client Trend'],
    ['Period', ...CLIENT_DEFS.map((client) => client.name)],
    ...input.multiLineClient.map((row) => [
      row.period,
      ...CLIENT_IDS.map((id) => String(row[id])),
    ]),
    [],
    ['Revenue Breakdown'],
    ['Sales Representative', ...input.periods, 'Grand Total'],
    ...input.tableRows.map((row) => [
      row.name,
      ...row.values.map(String),
      String(row.total),
    ]),
  );

  if (input.includeSystemTotal) {
    rows.push(['System Total', ...input.system.map(String), String(input.viewTotal)]);
  }

  return rows;
}

type ProjectRevenueLine = { project: string; revenue: number };

/** Demo project splits per rep (weights sum to 1). */
const REP_PROJECT_SPLITS: Record<RepKey, readonly { name: string; weight: number }[]> = {
  alice: [
    { name: 'Acme Corp · ERP rollout', weight: 0.58 },
    { name: 'Northwind SaaS', weight: 0.42 },
  ],
  bob: [
    { name: 'Globex · Data platform', weight: 0.62 },
    { name: 'Contoso Analytics', weight: 0.38 },
  ],
  carol: [
    { name: 'Initech · Billing integration', weight: 0.55 },
    { name: 'Fabrikam Support', weight: 0.45 },
  ],
  david: [
    { name: 'Umbrella · Mobile app', weight: 0.52 },
    { name: 'Tailspin IoT', weight: 0.48 },
  ],
};

function splitAmountByProjects(
  amount: number,
  projects: readonly { name: string; weight: number }[],
): ProjectRevenueLine[] {
  if (amount <= 0) {
    return projects.map((p) => ({ project: p.name, revenue: 0 }));
  }
  const totalWeight = projects.reduce((s, p) => s + p.weight, 0);
  let remaining = amount;
  return projects.map((p, i) => {
    if (i === projects.length - 1) {
      return { project: p.name, revenue: remaining };
    }
    const share = Math.round((amount * p.weight) / totalWeight);
    remaining -= share;
    return { project: p.name, revenue: share };
  });
}

function breakdownForCell(repKey: RepKey, amount: number, clientIds: ClientFilter): ProjectRevenueLine[] {
  if (amount === 0) return [];
  if (isAllClientsSelected(clientIds)) {
    return splitAmountByProjects(amount, REP_PROJECT_SPLITS[repKey]);
  }

  const owned = clientIds.filter((id) => CLIENT_OWNER[id] === repKey);
  if (owned.length === 0) return [];
  if (owned.length === 1) {
    const client = CLIENTS.find((c) => c.id === owned[0]);
    return [{ project: client?.name ?? owned[0], revenue: amount }];
  }

  const projects = owned.map((id) => ({
    name: CLIENTS.find((c) => c.id === id)?.name ?? id,
    weight: CLIENT_TAKE_OF_OWNER[id],
  }));
  return splitAmountByProjects(amount, projects);
}

function breakdownForRowTotal(
  repKey: RepKey,
  values: number[],
  clientIds: ClientFilter,
): ProjectRevenueLine[] {
  const totals = new Map<string, number>();
  values.forEach((amount) => {
    breakdownForCell(repKey, amount, clientIds).forEach(({ project, revenue }) => {
      totals.set(project, (totals.get(project) ?? 0) + revenue);
    });
  });
  return [...totals.entries()].map(([project, revenue]) => ({ project, revenue }));
}

type ClientBreakdownRow = {
  key: string;
  name: string;
  values: number[];
  total: number;
};

function clientRowsForRep(
  repKey: RepKey,
  values: number[],
  clientIds: ClientFilter,
): ClientBreakdownRow[] {
  const lines = breakdownForRowTotal(repKey, values, clientIds);
  if (lines.length === 0) return [];

  return lines.map(({ project }) => {
    const childValues = values.map((amount) => {
      const cellLines = breakdownForCell(repKey, amount, clientIds);
      return cellLines.find((line) => line.project === project)?.revenue ?? 0;
    });
    return {
      key: `${repKey}::${project}`,
      name: project,
      values: childValues,
      total: childValues.reduce((a, b) => a + b, 0),
    };
  });
}

function axisMoneyShort(n: number) {
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function maxSeries(values: readonly number[]) {
  return values.length ? Math.max(...values) : 0;
}

function maxChartValue(system: number[], byRep: Record<RepKey, number[]>) {
  let max = maxSeries(system);
  for (const k of REP_KEYS) {
    max = Math.max(max, maxSeries(byRep[k]));
  }
  return max;
}

function maxClientChartValue(byClient: Record<ClientId, number[]>) {
  let max = 0;
  for (const id of CLIENT_IDS) {
    max = Math.max(max, maxSeries(byClient[id]));
  }
  return max;
}

function clientsVisibleForSales(clientIds: ClientFilter, salesKeys: RepKey[]) {
  return CLIENT_DEFS.filter((c) => {
    if (!isAllClientsSelected(clientIds) && !clientIds.includes(c.key)) return false;
    return salesKeys.includes(CLIENT_OWNER[c.key]);
  });
}

function legendPayloadKey(entry: LegendPayload) {
  const key = entry.dataKey;
  return typeof key === 'string' || typeof key === 'number' ? String(key) : '';
}

function useTrendLegendToggle(resetKey: string) {
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    setHiddenKeys(new Set());
  }, [resetKey]);

  const onLegendClick = useCallback((entry: LegendPayload) => {
    const key = legendPayloadKey(entry);
    if (!key) return;
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const legendFormatter = useCallback(
    (value: string, entry: LegendPayload) => {
      const hidden = hiddenKeys.has(legendPayloadKey(entry));
      return (
        <span
          style={{
            color: hidden ? '#bfbfbf' : '#595959',
            cursor: 'pointer',
            textDecoration: hidden ? 'line-through' : undefined,
          }}
        >
          {value}
        </span>
      );
    },
    [hiddenKeys],
  );

  return { hiddenKeys, onLegendClick, legendFormatter };
}

function repsVisibleForClients(byRep: Record<RepKey, number[]>, clientIds: ClientFilter) {
  return REP_DEFS.filter((r) => {
    if (isAllClientsSelected(clientIds)) return true;
    return byRep[r.key].reduce((a, b) => a + b, 0) > 0;
  });
}

const chartTooltipShellStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '12px 14px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  minWidth: 168,
};


function ChartTooltipSeriesRow({
  color,
  name,
  amount,
}: {
  color: string;
  name: string;
  amount: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        fontSize: 13,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#595959' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: color,
            flexShrink: 0,
          }}
        />
        {name}
      </span>
      <span style={{ fontWeight: 600, color: '#1f1f1f' }}>{money(amount)}</span>
    </div>
  );
}

function IndividualSalesTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string | number | ((obj: unknown) => unknown); value?: unknown }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const rows = REP_DEFS.flatMap((rep) => {
    const entry = payload.find((p) => p.dataKey === rep.key);
    if (!entry) return [];
    return [{ rep, value: Number(entry.value ?? 0) }];
  });

  if (rows.length === 0) return null;

  return (
    <div style={chartTooltipShellStyle}>
      <div style={{ fontWeight: 600, color: '#262626', marginBottom: 10, fontSize: 13 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ rep, value }) => (
          <ChartTooltipSeriesRow key={rep.key} color={rep.color} name={rep.name} amount={value} />
        ))}
      </div>
    </div>
  );
}

function IndividualClientTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string | number | ((obj: unknown) => unknown); value?: unknown }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const rows = CLIENT_DEFS.flatMap((client) => {
    const entry = payload.find((p) => p.dataKey === client.key);
    if (!entry) return [];
    return [{ client, value: Number(entry.value ?? 0) }];
  });

  if (rows.length === 0) return null;

  return (
    <div style={chartTooltipShellStyle}>
      <div style={{ fontWeight: 600, color: '#262626', marginBottom: 10, fontSize: 13 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ client, value }) => (
          <ChartTooltipSeriesRow key={client.key} color={client.color} name={client.name} amount={value} />
        ))}
      </div>
    </div>
  );
}

function TotalRevenueTrendTooltip({
  active,
  payload,
  label,
  periods,
  byRep,
  clientIds,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown }>;
  label?: string | number;
  periods: string[];
  byRep: Record<RepKey, number[]>;
  clientIds: ClientFilter;
}) {
  if (!active || !payload?.length) return null;

  const idx = periods.indexOf(String(label ?? ''));
  if (idx < 0) return null;

  const total = Number(payload[0]?.value ?? 0);
  const visibleReps = repsVisibleForClients(byRep, clientIds);

  return (
    <div style={chartTooltipShellStyle}>
      <div style={{ fontWeight: 600, color: '#262626', marginBottom: 10, fontSize: 13 }}>{label}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: visibleReps.length > 0 ? 10 : 0,
          fontSize: 13,
        }}
      >
        <span style={{ color: '#8c8c8c' }}>Total</span>
        <span style={{ fontWeight: 600, color: '#1f1f1f' }}>{money(total)}</span>
      </div>
      {visibleReps.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleReps.map((r) => (
            <ChartTooltipSeriesRow
              key={r.key}
              color={r.color}
              name={r.name}
              amount={byRep[r.key][idx] ?? 0}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type RepTableRow = RevenueBreakdownRow & { rowType: 'rep' };
type ClientTableRow = ClientBreakdownRow & { rowType: 'client'; parentKey: RepKey };
type DisplayRow = RepTableRow | ClientTableRow;

export default function SalesRevenueAnalyticsPage() {
  const [monthRange, setMonthRange] = useState<MonthRangeValue>(() => resolveMonthPreset('ytd', REPORTING_END));
  const [activePreset, setActivePreset] = useState<QuickPresetKey | null>('ytd');
  const [selectedSalesKeys, setSelectedSalesKeys] = useState<SalesFilter>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<ClientFilter>([]);
  const [expandedRepKeys, setExpandedRepKeys] = useState<RepKey[]>([]);
  const [revenueTrendView, setRevenueTrendView] = useState<'sales' | 'client'>('sales');

  const normalizedMonthRange = useMemo(() => normalizeMonthRange(monthRange), [monthRange]);
  const rangeLabel = activePreset ? PRESET_LABELS[activePreset] : formatMonthRangeLabel(normalizedMonthRange);
  const monthStartKey = normalizedMonthRange.start.format('YYYY-MM');
  const monthEndKey = normalizedMonthRange.end.format('YYYY-MM');
  const filterScopeKey = `${monthStartKey}|${monthEndKey}|${selectedClientIds.join(',')}|${selectedSalesKeys.join(',')}`;

  const view = useMemo(
    () =>
      buildResolvedView(
        monthRangeFromKeys(monthStartKey, monthEndKey),
        selectedClientIds,
        selectedSalesKeys,
        rangeLabel,
      ),
    [monthEndKey, monthStartKey, rangeLabel, selectedClientIds, selectedSalesKeys],
  );

  const isAllReps = isAllSalesSelected(selectedSalesKeys);
  const isSingleRep = selectedSalesKeys.length === 1;
  const activeSalesKeys = useMemo(
    () => (isAllReps ? REP_KEYS : selectedSalesKeys),
    [isAllReps, selectedSalesKeys],
  );
  const trendLegendResetKey = `${view.periods.join('|')}|${selectedSalesKeys.join(',')}|${selectedClientIds.join(',')}`;
  const {
    hiddenKeys: hiddenSalesTrendKeys,
    onLegendClick: onSalesLegendClick,
    legendFormatter: salesLegendFormatter,
  } = useTrendLegendToggle(`${trendLegendResetKey}|sales`);
  const {
    hiddenKeys: hiddenClientTrendKeys,
    onLegendClick: onClientLegendClick,
    legendFormatter: clientLegendFormatter,
  } = useTrendLegendToggle(`${trendLegendResetKey}|client`);

  const primarySeries = view.system;

  const totalTrendData = useMemo(
    () => view.periods.map((p, i) => ({ period: p, revenue: primarySeries[i] ?? 0 })),
    [primarySeries, view.periods],
  );

  const multiLineData = useMemo(
    () =>
      view.periods.map((p, i) => ({
        period: p,
        alice: view.byRep.alice[i],
        bob: view.byRep.bob[i],
        carol: view.byRep.carol[i],
        david: view.byRep.david[i],
      })),
    [filterScopeKey, view.byRep, view.periods],
  );

  const multiLineClientData = useMemo(
    () =>
      view.periods.map((p, i) => ({
        period: p,
        acme: view.byClient.acme[i],
        globex: view.byClient.globex[i],
        initech: view.byClient.initech[i],
        umbrella: view.byClient.umbrella[i],
      })),
    [filterScopeKey, view.byClient, view.periods],
  );

  const tableRows: RevenueBreakdownRow[] = useMemo(
    () =>
      REP_DEFS.map((r) => {
        const values = view.byRep[r.key];
        const total = values.reduce((a, b) => a + b, 0);
        return { key: r.key, name: r.name, color: r.color, values, total };
      }),
    [filterScopeKey, view.byRep],
  );

  const filteredTableRows = useMemo(() => {
    const bySales = isAllReps ? tableRows : tableRows.filter((r) => activeSalesKeys.includes(r.key));
    if (isAllClientsSelected(selectedClientIds)) return bySales;
    return bySales.filter((r) => r.total > 0);
  }, [activeSalesKeys, isAllReps, selectedClientIds, tableRows]);

  useEffect(() => {
    setExpandedRepKeys([]);
  }, [filterScopeKey]);

  const toggleRepExpanded = useCallback((repKey: RepKey) => {
    setExpandedRepKeys((prev) =>
      prev.includes(repKey) ? prev.filter((k) => k !== repKey) : [...prev, repKey],
    );
  }, []);

  const displayTableRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    for (const rep of filteredTableRows) {
      rows.push({ ...rep, rowType: 'rep' });
      if (!expandedRepKeys.includes(rep.key)) continue;
      for (const client of clientRowsForRep(rep.key, rep.values, selectedClientIds)) {
        rows.push({ ...client, rowType: 'client', parentKey: rep.key });
      }
    }
    return rows;
  }, [expandedRepKeys, filteredTableRows, selectedClientIds]);

  const columns: TableColumnsType<DisplayRow> = useMemo(
    () => [
      {
        title: 'Sales Representative',
        dataIndex: 'name',
        key: 'name',
        width: 280,
        render: (name: string, record) => {
          if (record.rowType === 'client') {
            return (
              <Text type="secondary" style={{ display: 'block', paddingLeft: 34, fontSize: 13 }}>
                {name}
              </Text>
            );
          }

          const expandable = clientRowsForRep(record.key, record.values, selectedClientIds).length > 0;
          const expanded = expandedRepKeys.includes(record.key);

          return (
            <Space size={10} align="center">
              {expandable ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? `Collapse client breakdown for ${name}`
                      : `Expand client breakdown for ${name}`
                  }
                  onClick={() => toggleRepExpanded(record.key)}
                  className="analytics-revenue-expand-btn"
                >
                  {expanded ? (
                    <CaretDownOutlined style={{ fontSize: 11 }} />
                  ) : (
                    <CaretRightOutlined style={{ fontSize: 11 }} />
                  )}
                </button>
              ) : (
                <span className="analytics-revenue-expand-spacer" aria-hidden />
              )}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: record.color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <Text>{name}</Text>
            </Space>
          );
        },
      },
      ...view.periods.map((p, idx) => ({
        title: p,
        key: p,
        align: 'right' as const,
        render: (_: unknown, record: DisplayRow) => {
          const amount = record.values[idx] ?? 0;
          if (record.rowType === 'client') {
            return <Text type="secondary">{money(amount)}</Text>;
          }
          return <Text>{money(amount)}</Text>;
        },
      })),
      {
        title: 'Grand Total',
        key: 'total',
        align: 'right' as const,
        width: 140,
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'client') {
            return <Text type="secondary">{money(record.total)}</Text>;
          }
          return <Text strong>{money(record.total)}</Text>;
        },
      },
    ],
    [expandedRepKeys, filterScopeKey, selectedClientIds, toggleRepExpanded, view.periods],
  );

  const totalChartMax = useMemo(
    () => (isAllReps ? maxChartValue(view.system, view.byRep) : maxSeries(primarySeries)),
    [isAllReps, primarySeries, view.byRep, view.system],
  );

  const multiChartMax = useMemo(
    () => (isAllReps ? maxChartValue(view.system, view.byRep) : maxSeries(primarySeries)),
    [isAllReps, primarySeries, view.byRep, view.system],
  );

  const clientMultiChartMax = useMemo(() => maxClientChartValue(view.byClient), [view.byClient]);

  const viewTotal = useMemo(() => view.system.reduce((a, b) => a + b, 0), [view.system]);

  const primaryTotal = useMemo(() => primarySeries.reduce((a, b) => a + b, 0), [primarySeries]);

  const periodCount = view.periods.length;
  const avgPerPeriod = Math.round(primaryTotal / Math.max(1, periodCount));
  const latestValue = primarySeries[primarySeries.length - 1] ?? 0;
  const latestLabel = view.periods[view.periods.length - 1] ?? '—';

  const topRep = useMemo(() => {
    const candidates = isAllReps
      ? tableRows
      : tableRows.filter((r) => activeSalesKeys.includes(r.key));
    if (candidates.length === 0) return { name: '—', value: 0 };
    const best = candidates.reduce((a, b) => (b.total > a.total ? b : a));
    return { name: best.name, value: best.total };
  }, [activeSalesKeys, isAllReps, tableRows]);

  const selectedRepMeta = useMemo(
    () => (isSingleRep ? REP_DEFS.find((r) => r.key === selectedSalesKeys[0]) ?? null : null),
    [isSingleRep, selectedSalesKeys],
  );

  const visibleClientTrendDefs = useMemo(
    () => clientsVisibleForSales(selectedClientIds, activeSalesKeys),
    [activeSalesKeys, selectedClientIds],
  );

  const clientScopeLabel = useMemo(
    () => formatClientScopeLabel(selectedClientIds),
    [selectedClientIds],
  );

  const trendColor = THEME_PRIMARY;

  const shareOfTeam =
    isSingleRep && viewTotal > 0 ? Math.round((primaryTotal / viewTotal) * 1000) / 10 : null;

  const salesSelectOptions = useMemo(
    () => REP_DEFS.map((r) => ({ value: r.key, label: r.name })),
    [],
  );

  const clientSelectOptions = useMemo(
    () =>
      CLIENTS.map((c) => {
        const owner = REP_DEFS.find((r) => r.key === CLIENT_OWNER[c.id])?.name;
        return { value: c.id, label: `${c.name} — ${owner ?? ''}` };
      }),
    [],
  );

  const chartFillKey = isAllReps ? 'all' : activeSalesKeys.join('-');

  const pillSuffix = (
    <CaretDownFilled style={{ fontSize: 9, color: '#262626', display: 'block' }} />
  );

  const statItems = useMemo<AnalyticsStatItem[]>(
    () => [
      {
        key: 'total-revenue',
        title: 'Total Revenue',
        value: `$${primaryTotal.toLocaleString('en-US')}`,
        valueVariant: 'metric',
        rightLabel: isAllReps ? 'Team' : 'Rep',
      },
      {
        key: 'avg-period',
        title: 'Avg per Period',
        value: `$${avgPerPeriod.toLocaleString('en-US')}`,
        valueVariant: 'metric',
        note: `${periodCount} period${periodCount === 1 ? '' : 's'} in this view`,
        rightLabel: bucketLabel(),
      },
      {
        key: 'latest-period',
        title: 'Latest Period',
        value: `$${latestValue.toLocaleString('en-US')}`,
        valueVariant: 'metric',
        note: 'Last month in range',
        rightLabel: latestLabel,
      },
      {
        key: 'top-or-share',
        title: isSingleRep ? 'Share of team' : 'Top Sales Rep',
        value: isSingleRep ? `${shareOfTeam ?? 0}%` : personDisplayName(topRep.name),
        valueTitle: !isSingleRep && topRep.name !== '—' ? topRep.name : undefined,
        valueVariant: isSingleRep ? 'metric' : 'person',
        rightLabel: isSingleRep ? money(viewTotal) : money(topRep.value),
        rightLabelTone: isSingleRep ? 'positive' : 'default',
      },
    ],
    [avgPerPeriod, isSingleRep, latestLabel, latestValue, periodCount, primaryTotal, shareOfTeam, topRep, viewTotal],
  );

  const handleExportAnalytics = useCallback(() => {
    const salesLabel = formatSalesFilterLabel(selectedSalesKeys);
    const clientLabel = isAllClientsSelected(selectedClientIds)
      ? 'All Client & Projects'
      : selectedClientIds
          .map((id) => CLIENTS.find((c) => c.id === id)?.name ?? id)
          .join(', ');

    const rows = buildAnalyticsExportRows({
      exportedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      rangeLabel,
      monthRangeLabel: formatMonthRangeLabel(monthRange),
      salesLabel,
      clientLabel,
      viewNote: view.note,
      statItems,
      periods: view.periods,
      system: view.system,
      totalTrend: totalTrendData,
      multiLine: multiLineData,
      multiLineClient: multiLineClientData,
      tableRows: filteredTableRows,
      viewTotal,
      includeSystemTotal: isAllReps,
    });

    const filename = `sales-revenue-analytics-${dayjs().format('YYYY-MM-DD')}.csv`;
    downloadCsvFile(filename, rows);
    message.success(`Exported ${filename}`);
  }, [
    filteredTableRows,
    isAllReps,
    monthRange,
    multiLineData,
    multiLineClientData,
    rangeLabel,
    selectedClientIds,
    selectedSalesKeys,
    statItems,
    totalTrendData,
    view.note,
    view.periods,
    view.system,
    viewTotal,
  ]);

  return (
    <DashboardShell selectedMenuKey="billing-dashboard">
      <div style={{ padding: '20px 24px 28px', background: '#f4f6f9', minHeight: '100%' }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col flex="auto">
            <Space size={8} align="center" wrap>
              <Link
                to="/"
                aria-label="Back to Billing Dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: THEME_PRIMARY,
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                <LeftOutlined />
              </Link>
              <Space size={6} align="center" wrap style={{ fontSize: 15 }}>
                <Link to="/" style={{ color: THEME_PRIMARY, fontWeight: 500 }}>
                  Billing Dashboard
                </Link>
                <Text style={{ color: '#1f1f1f' }}>-</Text>
                <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>Sales Revenue Analytics</Text>
              </Space>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<DownloadOutlined />}
              style={{ borderRadius: 8 }}
              onClick={handleExportAnalytics}
            >
              Export Analytics Data
            </Button>
          </Col>
        </Row>

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 16, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '16px 18px 14px' } }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 20,
              rowGap: 14,
            }}
          >
            <MonthRangePicker
              value={monthRange}
              activePreset={activePreset}
              referenceDate={REPORTING_END}
              onChange={(next, preset) => {
                setMonthRange(normalizeMonthRange(next));
                setActivePreset(preset ?? null);
              }}
            />
            <Select
              mode="multiple"
              allowClear
              className="analytics-toolbar-select"
              value={selectedClientIds}
              onChange={(values) => setSelectedClientIds(values as ClientFilter)}
              options={clientSelectOptions}
              placeholder="All Client"
              maxTagCount={1}
              maxTagPlaceholder={(omitted) => `+${omitted.length}`}
              suffixIcon={pillSuffix}
              popupMatchSelectWidth={false}
            />
            <Select
              mode="multiple"
              allowClear
              className="analytics-toolbar-select"
              value={selectedSalesKeys}
              onChange={(values) => setSelectedSalesKeys(values as SalesFilter)}
              options={salesSelectOptions}
              placeholder="All Sales"
              maxTagCount={1}
              maxTagPlaceholder={(omitted) => `+${omitted.length}`}
              suffixIcon={pillSuffix}
              popupMatchSelectWidth={false}
            />
          </div>
        </Card>

        <AnalyticsStatBar items={statItems} />

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '18px 18px 8px' } }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            Total Revenue Trend
          </Title>
          {isAllReps ? (
            clientScopeLabel ? (
              <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                {`Revenue for ${clientScopeLabel} — system total in this view ($) — click a data point to see project details`}
              </Text>
            ) : null
          ) : (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              {`${isSingleRep ? selectedRepMeta?.name : formatSalesFilterLabel(selectedSalesKeys)}${clientScopeLabel ? ` · ${clientScopeLabel}` : ''} · revenue ($) in this view — team total in same view: ${money(viewTotal)}`}
            </Text>
          )}
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer key={`total-${filterScopeKey}`}>
              <AreaChart data={totalTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`revFill-${chartFillKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e8e8e8' }} />
                <YAxis
                  tickFormatter={(v) => axisMoneyShort(Number(v))}
                  domain={[0, Math.max(500, Math.ceil(totalChartMax * 1.12))]}
                  tick={{ fontSize: 12 }}
                  width={56}
                  axisLine={{ stroke: '#e8e8e8' }}
                />
                <RTooltip
                  content={({ active, payload, label }) => (
                    <TotalRevenueTrendTooltip
                      active={active}
                      payload={payload}
                      label={label}
                      periods={view.periods}
                      byRep={view.byRep}
                      clientIds={selectedClientIds}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={trendColor}
                  strokeWidth={2}
                  fill={`url(#revFill-${chartFillKey})`}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: trendColor }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 16, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '18px 18px 8px' } }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontWeight: 600, color: '#1f1f1f' }}>
            Revenue by
          </Title>
          <div className="analytics-revenue-by-toggle" role="tablist" aria-label="Revenue by view">
            <button
              type="button"
              role="tab"
              aria-selected={revenueTrendView === 'sales'}
              className={
                revenueTrendView === 'sales'
                  ? 'analytics-revenue-by-toggle__btn analytics-revenue-by-toggle__btn--active'
                  : 'analytics-revenue-by-toggle__btn'
              }
              onClick={() => setRevenueTrendView('sales')}
            >
              By sales rep
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={revenueTrendView === 'client'}
              className={
                revenueTrendView === 'client'
                  ? 'analytics-revenue-by-toggle__btn analytics-revenue-by-toggle__btn--active'
                  : 'analytics-revenue-by-toggle__btn'
              }
              onClick={() => setRevenueTrendView('client')}
            >
              By client
            </button>
          </div>
          <div style={{ width: '100%', height: 340 }}>
            {revenueTrendView === 'sales' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  key={`sales-${filterScopeKey}`}
                  data={multiLineData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e8e8e8' }} />
                  <YAxis
                    tickFormatter={(v) => axisMoneyShort(Number(v))}
                    domain={[0, Math.max(500, Math.ceil(multiChartMax * 1.12))]}
                    tick={{ fontSize: 12 }}
                    width={56}
                    axisLine={{ stroke: '#e8e8e8' }}
                  />
                  <RTooltip
                    content={({ active, payload, label }) => (
                      <IndividualSalesTrendTooltip active={active} payload={payload} label={label} />
                    )}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                    onClick={onSalesLegendClick}
                    formatter={salesLegendFormatter}
                  />
                  {REP_DEFS.map((r) => {
                    if (!activeSalesKeys.includes(r.key)) return null;
                    const repTotal = view.byRep[r.key].reduce((a, b) => a + b, 0);
                    if (!isAllClientsSelected(selectedClientIds) && repTotal === 0) return null;
                    const hidden = hiddenSalesTrendKeys.has(r.key);
                    return (
                      <Line
                        key={r.key}
                        type="monotone"
                        dataKey={r.key}
                        name={r.name}
                        stroke={r.color}
                        strokeWidth={2}
                        strokeOpacity={hidden ? 0.2 : 1}
                        hide={hidden}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: r.color }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  key={`client-${filterScopeKey}`}
                  data={multiLineClientData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e8e8e8' }} />
                  <YAxis
                    tickFormatter={(v) => axisMoneyShort(Number(v))}
                    domain={[0, Math.max(500, Math.ceil(clientMultiChartMax * 1.12))]}
                    tick={{ fontSize: 12 }}
                    width={56}
                    axisLine={{ stroke: '#e8e8e8' }}
                  />
                  <RTooltip
                    content={({ active, payload, label }) => (
                      <IndividualClientTrendTooltip active={active} payload={payload} label={label} />
                    )}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                    onClick={onClientLegendClick}
                    formatter={clientLegendFormatter}
                  />
                  {visibleClientTrendDefs.map((c) => {
                    const clientTotal = view.byClient[c.key].reduce((a, b) => a + b, 0);
                    if (clientTotal === 0) return null;
                    const hidden = hiddenClientTrendKeys.has(c.key);
                    return (
                      <Line
                        key={c.key}
                        type="monotone"
                        dataKey={c.key}
                        name={c.name}
                        stroke={c.color}
                        strokeWidth={2}
                        strokeOpacity={hidden ? 0.2 : 1}
                        hide={hidden}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: c.color }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <ClientCollectionChartCard
          filterScopeKey={filterScopeKey}
          periodCount={view.periods.length}
          selectedSalesKeys={selectedSalesKeys}
        />

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '18px 18px 18px' } }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            Revenue breakdown
            {clientScopeLabel ? (
              <Text type="secondary" style={{ fontWeight: 400, marginLeft: 6 }}>
                · {clientScopeLabel}
              </Text>
            ) : null}
          </Title>
          <Table<DisplayRow>
            key={filterScopeKey}
            className="analytics-revenue-table"
            rowKey="key"
            columns={columns}
            dataSource={displayTableRows}
            rowClassName={(record) =>
              record.rowType === 'client' ? 'analytics-revenue-client-row' : ''
            }
            pagination={false}
            size="middle"
            bordered
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No revenue for this sales + client combination in the demo."
                />
              ),
            }}
            summary={
              isAllReps
                ? () => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ background: 'rgba(70, 155, 255, 0.08)' }}>
                        <Table.Summary.Cell index={0}>
                          <Text strong>System Total</Text>
                        </Table.Summary.Cell>
                        {view.periods.map((p, idx) => (
                          <Table.Summary.Cell key={p} index={idx + 1} align="right">
                            <Text strong>{money(view.system[idx])}</Text>
                          </Table.Summary.Cell>
                        ))}
                        <Table.Summary.Cell index={view.periods.length + 1} align="right">
                          <Text strong>{money(viewTotal)}</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )
                : undefined
            }
          />
        </Card>
      </div>
    </DashboardShell>
  );
}
