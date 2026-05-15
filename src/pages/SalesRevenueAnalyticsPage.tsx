import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
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
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { CaretDownFilled, DownloadOutlined, LeftOutlined } from '@ant-design/icons';
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
import {
  MonthRangePicker,
  formatMonthRangeLabel,
  resolveMonthPreset,
  type MonthRangeValue,
  type QuickPresetKey,
} from '../components/MonthRangePicker';
import { AnalyticsStatBar, type AnalyticsStatItem } from '../components/AnalyticsStatBar';
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

export type SalesFilter = 'all' | RepKey;

const CLIENTS = [
  { id: 'acme', name: 'Acme Corp · ERP rollout' },
  { id: 'globex', name: 'Globex · Data platform' },
  { id: 'initech', name: 'Initech · Billing integration' },
  { id: 'umbrella', name: 'Umbrella · Mobile app' },
] as const;

type ClientId = (typeof CLIENTS)[number]['id'];

export type ClientFilter = 'all' | ClientId;

const CLIENT_IDS: ClientId[] = CLIENTS.map((c) => c.id);

/** One owning sales rep per client; revenue is 100% on that rep’s row for this client (demo share of their book). */
const CLIENT_OWNER: Record<ClientId, RepKey> = {
  acme: 'alice',
  globex: 'bob',
  initech: 'carol',
  umbrella: 'david',
};

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
  bucket: 'month';
  rangeLabel: string;
  note?: string;
};

function monthInRange(month: Dayjs, range: MonthRangeValue) {
  const key = month.year() * 12 + month.month();
  const startKey = range.start.year() * 12 + range.start.month();
  const endKey = range.end.year() * 12 + range.end.month();
  return key >= startKey && key <= endKey;
}

function monthlySystemFromRep(byRep: Record<RepKey, readonly number[]>): number[] {
  return PERIODS.map((_, i) => REP_KEYS.reduce((s, k) => s + byRep[k][i], 0));
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

function monthlyByRepForClient(clientFilter: ClientFilter): Record<RepKey, readonly number[]> {
  if (clientFilter === 'all') return BREAKDOWN;
  return CLIENT_REP_MONTHLY[clientFilter];
}

function clientFilterNote(clientFilter: ClientFilter): string | undefined {
  if (clientFilter === 'all') return undefined;
  const row = CLIENTS.find((c) => c.id === clientFilter);
  const owner = REP_DEFS.find((r) => r.key === CLIENT_OWNER[clientFilter])?.name;
  const label = row?.name ?? clientFilter;
  return `Client / project: ${label} · owner: ${owner ?? '—'} (demo)`;
}

/** Build analytics view from demo monthly rows, filtered to the selected month range. */
function buildResolvedView(range: MonthRangeValue, clientFilter: ClientFilter, rangeLabel: string): BuiltView {
  const monthly = Object.fromEntries(
    REP_KEYS.map((k) => [k, [...monthlyByRepForClient(clientFilter)[k]]]),
  ) as Record<RepKey, number[]>;
  const m = monthlySystemFromRep(monthly);
  const baseNote = clientFilterNote(clientFilter);
  const indices = DEMO_MONTHS.map((month, i) => ({ month, i }))
    .filter(({ month }) => monthInRange(month, range))
    .map(({ i }) => i);

  const periods = indices.map((i) => PERIODS[i]);
  const system = indices.map((i) => m[i]);
  const byRep = Object.fromEntries(
    REP_KEYS.map((k) => [k, indices.map((i) => monthly[k][i])]),
  ) as Record<RepKey, number[]>;

  return {
    periods,
    system,
    byRep,
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

function breakdownForCell(repKey: RepKey, amount: number, clientFilter: ClientFilter): ProjectRevenueLine[] {
  if (amount === 0) return [];
  if (clientFilter !== 'all') {
    const client = CLIENTS.find((c) => c.id === clientFilter);
    return [{ project: client?.name ?? clientFilter, revenue: amount }];
  }
  return splitAmountByProjects(amount, REP_PROJECT_SPLITS[repKey]);
}

function breakdownForRowTotal(
  repKey: RepKey,
  values: number[],
  clientFilter: ClientFilter,
): ProjectRevenueLine[] {
  const totals = new Map<string, number>();
  values.forEach((amount) => {
    breakdownForCell(repKey, amount, clientFilter).forEach(({ project, revenue }) => {
      totals.set(project, (totals.get(project) ?? 0) + revenue);
    });
  });
  return [...totals.entries()].map(([project, revenue]) => ({ project, revenue }));
}

function RevenueAmountTooltipCell({
  amount,
  lines,
  strong,
}: {
  amount: number;
  lines: ProjectRevenueLine[];
  strong?: boolean;
}) {
  const label = <Text strong={strong}>{money(amount)}</Text>;

  if (lines.length === 0) {
    return label;
  }

  return (
    <Tooltip
      title={<RevenueBreakdownTooltipContent amount={amount} lines={lines} />}
      overlayClassName="revenue-breakdown-tooltip"
      color="#fff"
    >
      <span style={{ cursor: 'default', display: 'inline-block' }}>{label}</span>
    </Tooltip>
  );
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

function repsVisibleForClient(byRep: Record<RepKey, number[]>, clientFilter: ClientFilter) {
  return REP_DEFS.filter((r) => {
    if (clientFilter === 'all') return true;
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

function ChartTooltipDetailRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        fontSize: 13,
      }}
    >
      <span style={{ color: '#595959', flex: 1, minWidth: 0, lineHeight: 1.4 }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1f1f1f', whiteSpace: 'nowrap' }}>{money(amount)}</span>
    </div>
  );
}

function RevenueBreakdownTooltipContent({
  amount,
  lines,
}: {
  amount: number;
  lines: ProjectRevenueLine[];
}) {
  return (
    <div style={{ ...chartTooltipShellStyle, maxWidth: 320 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: lines.length > 0 ? 10 : 0,
          fontSize: 13,
        }}
      >
        <span style={{ color: '#8c8c8c' }}>Total</span>
        <span style={{ fontWeight: 600, color: '#1f1f1f' }}>{money(amount)}</span>
      </div>
      {lines.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lines.map((line) => (
            <ChartTooltipDetailRow key={line.project} label={line.project} amount={line.revenue} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

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

function TotalRevenueTrendTooltip({
  active,
  payload,
  label,
  periods,
  byRep,
  clientFilter,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown }>;
  label?: string | number;
  periods: string[];
  byRep: Record<RepKey, number[]>;
  clientFilter: ClientFilter;
}) {
  if (!active || !payload?.length) return null;

  const idx = periods.indexOf(String(label ?? ''));
  if (idx < 0) return null;

  const total = Number(payload[0]?.value ?? 0);
  const visibleReps = repsVisibleForClient(byRep, clientFilter);

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

type Row = RevenueBreakdownRow;

export default function SalesRevenueAnalyticsPage() {
  const [monthRange, setMonthRange] = useState<MonthRangeValue>(() => resolveMonthPreset('ytd', REPORTING_END));
  const [activePreset, setActivePreset] = useState<QuickPresetKey | null>('ytd');
  const [salesFilter, setSalesFilter] = useState<SalesFilter>('all');
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all');

  const rangeLabel = activePreset ? PRESET_LABELS[activePreset] : formatMonthRangeLabel(monthRange);

  const view = useMemo(
    () => buildResolvedView(monthRange, clientFilter, rangeLabel),
    [clientFilter, monthRange, rangeLabel],
  );

  const isAllReps = salesFilter === 'all';

  const primarySeries = useMemo(
    () => (isAllReps ? view.system : view.byRep[salesFilter]),
    [isAllReps, salesFilter, view.byRep, view.system],
  );

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
    [view],
  );

  const tableRows: Row[] = useMemo(
    () =>
      REP_DEFS.map((r) => {
        const values = view.byRep[r.key];
        const total = values.reduce((a, b) => a + b, 0);
        return { key: r.key, name: r.name, color: r.color, values, total };
      }),
    [view],
  );

  const filteredTableRows = useMemo(() => {
    const bySales = isAllReps ? tableRows : tableRows.filter((r) => r.key === salesFilter);
    if (clientFilter === 'all') return bySales;
    return bySales.filter((r) => r.total > 0);
  }, [clientFilter, isAllReps, salesFilter, tableRows]);

  const columns: TableColumnsType<Row> = useMemo(
    () => [
      {
        title: 'Sales Representative',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (name: string, record) => (
          <Space size={10}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: record.color,
                display: 'inline-block',
              }}
            />
            <Text>{name}</Text>
          </Space>
        ),
      },
      ...view.periods.map((p, idx) => ({
        title: p,
        key: p,
        align: 'right' as const,
        render: (_: unknown, record: Row) => (
          <RevenueAmountTooltipCell
            amount={record.values[idx]}
            lines={breakdownForCell(record.key, record.values[idx], clientFilter)}
          />
        ),
      })),
      {
        title: 'Grand Total',
        key: 'total',
        align: 'right' as const,
        width: 140,
        render: (_: unknown, record: Row) => (
          <RevenueAmountTooltipCell
            amount={record.total}
            lines={breakdownForRowTotal(record.key, record.values, clientFilter)}
            strong
          />
        ),
      },
    ],
    [clientFilter, view.periods],
  );

  const totalChartMax = useMemo(() => {
    if (isAllReps) return maxChartValue(view.system, view.byRep);
    return maxSeries(primarySeries);
  }, [isAllReps, primarySeries, view.byRep, view.system]);

  const multiChartMax = useMemo(() => {
    if (isAllReps) return maxChartValue(view.system, view.byRep);
    return maxSeries(primarySeries);
  }, [isAllReps, primarySeries, view.byRep, view.system]);

  const viewTotal = useMemo(() => view.system.reduce((a, b) => a + b, 0), [view.system]);

  const primaryTotal = useMemo(() => primarySeries.reduce((a, b) => a + b, 0), [primarySeries]);

  const periodCount = view.periods.length;
  const avgPerPeriod = Math.round(primaryTotal / Math.max(1, periodCount));
  const latestValue = primarySeries[primarySeries.length - 1] ?? 0;
  const latestLabel = view.periods[view.periods.length - 1] ?? '—';

  const topRep = useMemo(() => {
    if (tableRows.length === 0) return { name: '—', value: 0 };
    const best = tableRows.reduce((a, b) => (b.total > a.total ? b : a));
    return { name: best.name, value: best.total };
  }, [tableRows]);

  const selectedRepMeta = useMemo(
    () => (isAllReps ? null : REP_DEFS.find((r) => r.key === salesFilter) ?? null),
    [isAllReps, salesFilter],
  );

  const clientScopeLabel = useMemo(
    () => (clientFilter === 'all' ? null : CLIENTS.find((c) => c.id === clientFilter)?.name ?? null),
    [clientFilter],
  );

  const trendColor = THEME_PRIMARY;

  const shareOfTeam =
    !isAllReps && viewTotal > 0 ? Math.round((primaryTotal / viewTotal) * 1000) / 10 : null;

  const salesSelectOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'All Sales' },
      ...REP_DEFS.map((r) => ({ value: r.key, label: r.name })),
    ],
    [],
  );

  const clientSelectOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'All Client & Projects' },
      ...CLIENTS.map((c) => {
        const owner = REP_DEFS.find((r) => r.key === CLIENT_OWNER[c.id])?.name;
        return { value: c.id, label: `${c.name} — ${owner ?? ''}` };
      }),
    ],
    [],
  );

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
        rightLabel: latestLabel,
      },
      {
        key: 'top-or-share',
        title: isAllReps ? 'Top Sales Rep' : 'Share of team',
        value: isAllReps ? personDisplayName(topRep.name) : `${shareOfTeam ?? 0}%`,
        valueTitle: isAllReps && topRep.name !== '—' ? topRep.name : undefined,
        valueVariant: isAllReps ? 'person' : 'metric',
        rightLabel: isAllReps ? money(topRep.value) : money(viewTotal),
        rightLabelTone: !isAllReps ? 'positive' : 'default',
      },
    ],
    [avgPerPeriod, isAllReps, latestLabel, latestValue, periodCount, primaryTotal, shareOfTeam, topRep, viewTotal],
  );

  const handleExportAnalytics = useCallback(() => {
    const salesLabel =
      salesFilter === 'all'
        ? 'All Sales'
        : (REP_DEFS.find((r) => r.key === salesFilter)?.name ?? salesFilter);
    const clientLabel =
      clientFilter === 'all'
        ? 'All Client & Projects'
        : (CLIENTS.find((c) => c.id === clientFilter)?.name ?? clientFilter);

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
      tableRows: filteredTableRows,
      viewTotal,
      includeSystemTotal: isAllReps,
    });

    const filename = `sales-revenue-analytics-${dayjs().format('YYYY-MM-DD')}.csv`;
    downloadCsvFile(filename, rows);
    message.success(`Exported ${filename}`);
  }, [
    clientFilter,
    filteredTableRows,
    isAllReps,
    monthRange,
    multiLineData,
    rangeLabel,
    salesFilter,
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
                setMonthRange(next);
                setActivePreset(preset ?? null);
              }}
            />
            <Select<ClientFilter>
              className="analytics-toolbar-select"
              value={clientFilter}
              onChange={(v) => setClientFilter(v)}
              options={clientSelectOptions}
              suffixIcon={pillSuffix}
              popupMatchSelectWidth={false}
            />
            <Select<SalesFilter>
              className="analytics-toolbar-select"
              value={salesFilter}
              onChange={(v) => setSalesFilter(v)}
              options={salesSelectOptions}
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
              {`${selectedRepMeta?.name}${clientScopeLabel ? ` · ${clientScopeLabel}` : ''} · revenue ($) in this view — team total in same view: ${money(viewTotal)}`}
            </Text>
          )}
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <AreaChart data={totalTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`revFill-${salesFilter}`} x1="0" y1="0" x2="0" y2="1">
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
                      clientFilter={clientFilter}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={trendColor}
                  strokeWidth={2}
                  fill={`url(#revFill-${salesFilter})`}
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
          <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            Individual Sales Trend
          </Title>
          {isAllReps ? (
            clientScopeLabel ? (
              <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                {`Revenue per sales rep for ${clientScopeLabel} ($) — hover to highlight, click legend to toggle`}
              </Text>
            ) : null
          ) : (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              {`Showing ${selectedRepMeta?.name}${clientScopeLabel ? ` · ${clientScopeLabel}` : ''} only — choose “All sales” to compare everyone`}
            </Text>
          )}
          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer>
              <LineChart data={multiLineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {REP_DEFS.map((r) => {
                  if (!isAllReps && r.key !== salesFilter) return null;
                  const repTotal = view.byRep[r.key].reduce((a, b) => a + b, 0);
                  if (clientFilter !== 'all' && repTotal === 0) return null;
                  const dataKey = r.key;
                  return (
                    <Line
                      key={r.key}
                      type="monotone"
                      dataKey={dataKey}
                      name={r.name}
                      stroke={r.color}
                      strokeWidth={2}
                      strokeOpacity={1}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: r.color }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

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
          <Table<Row>
            className="analytics-revenue-table"
            rowKey="key"
            columns={columns}
            dataSource={filteredTableRows}
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
