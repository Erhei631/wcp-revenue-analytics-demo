import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Avatar,
  Card,
  Empty,
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
  LeftOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import {
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
import {
  DEMO_MONTH_COUNT,
  DEMO_MONTHS,
  DEMO_PERIOD_LABELS,
  REPORTING_END,
  buildAllRepMonthlySeries,
} from '../data/analyticsDemoSeries';
import {
  blendFeeProfiles,
  feeProfileForClientId,
  splitServiceFeeTotal,
} from '../data/accountFeeProfiles';
import { ClientCollectionChartCard } from '../components/ClientCollectionChartCard';
import { NewLogosBreakdownTable } from '../components/NewLogosBreakdownTable';
import { isNewLogoClientInRange, isNewLogoClientZeroRevenue } from '../data/newLogoDemo';
import { RevenueByClientRankList } from '../components/RevenueByClientRankList';
import { ServiceFeeBreakdownCell } from '../components/ServiceFeeBreakdownCell';
import {
  buildClientMonthlyFromReps,
  computeRangeChangePct,
  DEMO_CLIENT_CATALOG,
  DEMO_DECLINING_CLIENT_RANKS,
  shapeDecliningClientSeries,
  DEMO_CLIENT_IDS,
  DEMO_CLIENT_OWNER,
} from '../data/demoClientCatalog';
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
import { presaleEffortFromHours, sumPresaleHours } from '../data/presaleDemoHours';
import { coerceAmount, formatMoney, formatMoneyValue } from '../utils/moneyFormat';

const { Text, Title } = Typography;

const PERIODS = DEMO_PERIOD_LABELS;

/** Total Revenue Trend chart colors */
const TREND_CASH_COLOR = '#469BFF';
const TREND_EQUITY_COLOR = '#57CEF4';
const TREND_TOTAL_LINE_COLOR = CHART_PURPLE;

const PRESET_LABELS: Record<QuickPresetKey, string> = {
  last3: 'Last 3 months',
  ytd: 'Year to date',
  last6: 'Last 6 months',
  last12: 'Last 12 months',
  year2026: '2026',
  year2025: '2025',
  q2_2026: 'Q2 2026',
  q1_2026: 'Q1 2026',
};

const REP_DEFS = [
  {
    key: 'alice',
    name: 'Alice Chen',
    color: CHART_PURPLE,
    soft: CHART_PURPLE_SOFT,
    avatarUrl: '/avatars/alice-chen.jpg',
  },
  {
    key: 'bob',
    name: 'Bob Li',
    color: CHART_GREEN,
    soft: CHART_GREEN_SOFT,
    avatarUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
  },
  {
    key: 'carol',
    name: 'Carol Wang',
    color: CHART_RED,
    soft: CHART_RED_SOFT,
    avatarUrl: 'https://randomuser.me/api/portraits/women/90.jpg',
  },
  {
    key: 'david',
    name: 'David Park',
    color: CHART_BROWN,
    soft: CHART_BROWN_SOFT,
    avatarUrl: 'https://randomuser.me/api/portraits/men/52.jpg',
  },
] as const;

type RepKey = (typeof REP_DEFS)[number]['key'];

/** Empty array means all sales reps are included. */
export type SalesFilter = RepKey[];

type ClientId = (typeof DEMO_CLIENT_IDS)[number];

/** Empty array means all clients & projects are included. */
export type ClientFilter = ClientId[];

const CLIENTS = DEMO_CLIENT_CATALOG.map((c) => ({ id: c.id, name: c.name }));
const CLIENT_IDS: ClientId[] = DEMO_CLIENT_IDS;
const CLIENT_OWNER = DEMO_CLIENT_OWNER;
const CLIENT_DEFS = DEMO_CLIENT_CATALOG.map((c) => ({
  key: c.id,
  name: c.name,
  color: c.color,
  logoUrl: c.logoUrl,
}));

/** Portion of the owner’s posted monthly revenue attributed to this account (rest = other deals, not listed). */
const CLIENT_TAKE_OF_OWNER: Partial<Record<ClientId, number>> = {
  acme: 0.58,
  globex: 0.62,
  initech: 0.55,
  umbrella: 0.52,
};

const REP_KEYS: RepKey[] = ['alice', 'bob', 'carol', 'david'];

const BREAKDOWN: Record<RepKey, number[]> = buildAllRepMonthlySeries();

const CLIENT_MONTHLY_BASE = buildClientMonthlyFromReps(
  Object.fromEntries(REP_KEYS.map((k) => [k, [...BREAKDOWN[k]]])) as Record<RepKey, number[]>,
  DEMO_MONTH_COUNT,
);

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
    const owner = CLIENT_OWNER[id];
    for (let i = 0; i < PERIODS.length; i++) {
      merged[owner][i] += coerceAmount(CLIENT_MONTHLY_BASE[id][i]);
    }
  }

  return merged;
}

function monthlyByClientForClients(clientIds: ClientFilter): Record<ClientId, number[]> {
  return Object.fromEntries(
    CLIENT_IDS.map((id) => {
      const values = [...CLIENT_MONTHLY_BASE[id]];
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
        REP_KEYS.reduce((sum, key) => sum + coerceAmount(byRep[key][i]), 0),
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
    salesKeys.reduce((sum, key) => sum + coerceAmount(scopedByRep[key][i]), 0),
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
    REP_KEYS.map((k) => [k, indices.map((i) => coerceAmount(monthly[k][i]))]),
  ) as Record<RepKey, number[]>;
  const byClient = Object.fromEntries(
    CLIENT_IDS.map((id) => [id, indices.map((i) => coerceAmount(monthlyClients[id][i]))]),
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

function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '—').toUpperCase();
}

function personFirstName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? name;
}

const REVENUE_BREAKDOWN_NAME_COL_WIDTH = 280;
const REVENUE_BREAKDOWN_PERIOD_COL_WIDTH = 112;
const REVENUE_BREAKDOWN_TOTAL_COL_WIDTH = 140;

type RevenueBreakdownRow = {
  key: RepKey;
  name: string;
  color: string;
  values: number[];
  total: number;
};

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
    weight: CLIENT_TAKE_OF_OWNER[id] ?? 1,
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
  clientId?: ClientId;
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
    const matchedClient = CLIENTS.find((c) => c.name === project);
    return {
      key: `${repKey}::${project}`,
      name: project,
      values: childValues,
      total: childValues.reduce((a, b) => a + coerceAmount(b), 0),
      clientId: matchedClient?.id,
    };
  });
}

function axisMoneyShort(n: number) {
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function maxSeries(values: readonly number[]) {
  const amounts = values.map(coerceAmount);
  return amounts.length ? Math.max(...amounts) : 0;
}

/** Y-axis top from plotted max; small headroom, no arbitrary floor. */
function yAxisMaxFromDataMax(dataMax: number, padding = 1.08) {
  if (dataMax <= 0) return 100;
  return Math.ceil(dataMax * padding);
}

function maxPlottedRepSeries(
  byRep: Record<RepKey, number[]>,
  salesKeys: readonly RepKey[],
  hiddenKeys: ReadonlySet<string>,
  clientIds: ClientFilter,
) {
  let max = 0;
  for (const key of salesKeys) {
    if (hiddenKeys.has(key)) continue;
    const values = byRep[key];
    if (!values?.length) continue;
    if (!isAllClientsSelected(clientIds)) {
      const repTotal = values.reduce((sum, value) => sum + coerceAmount(value), 0);
      if (repTotal === 0) continue;
    }
    max = Math.max(max, maxSeries(values));
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
      <span style={{ fontWeight: 600, color: '#1f1f1f' }}>{formatMoneyValue(amount)}</span>
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


type TotalTrendPoint = {
  period: string;
  revenue: number;
  equity: number;
  cash: number;
};

function TotalRevenueTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TotalTrendPoint }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const equity = coerceAmount(point.equity);
  const cash = coerceAmount(point.cash);
  const total = coerceAmount(point.revenue);

  return (
    <div style={chartTooltipShellStyle}>
      <div style={{ fontWeight: 600, color: '#262626', marginBottom: 10, fontSize: 13 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ChartTooltipSeriesRow color={TREND_EQUITY_COLOR} name="Equity" amount={equity} />
        <ChartTooltipSeriesRow color={TREND_CASH_COLOR} name="Cash" amount={cash} />
      </div>
      <div style={{ height: 1, background: '#f0f0f0', margin: '10px 0' }} />
      <ChartTooltipSeriesRow color={TREND_TOTAL_LINE_COLOR} name="Total Revenue" amount={total} />
    </div>
  );
}


type RepTableRow = RevenueBreakdownRow & { rowType: 'rep' };
type ClientTableRow = ClientBreakdownRow & { rowType: 'client'; parentKey: RepKey };
type DisplayRow = RepTableRow | ClientTableRow;

function clientIdForDisplayRow(record: DisplayRow): ClientId | undefined {
  if (record.rowType !== 'client') return undefined;
  return record.clientId ?? CLIENTS.find((c) => c.name === record.name)?.id;
}

function repRowExpandable(record: RepTableRow, selectedClientIds: ClientFilter) {
  return clientRowsForRep(record.key, record.values, selectedClientIds).length > 0;
}

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
  const primarySeries = view.system;

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

  const tableRows: RevenueBreakdownRow[] = useMemo(
    () =>
      REP_DEFS.map((r) => {
        const values = view.byRep[r.key];
        const total = values.reduce((a, b) => a + coerceAmount(b), 0);
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

  const revenueTableScrollX = useMemo(
    () =>
      REVENUE_BREAKDOWN_NAME_COL_WIDTH +
      view.periods.length * REVENUE_BREAKDOWN_PERIOD_COL_WIDTH +
      REVENUE_BREAKDOWN_TOTAL_COL_WIDTH,
    [view.periods.length],
  );

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

          const expandable = repRowExpandable(record, selectedClientIds);
          const expanded = expandedRepKeys.includes(record.key);

          return (
            <Space size={10} align="center">
              {expandable ? (
                <span className="analytics-revenue-expand-icon" aria-hidden>
                  {expanded ? (
                    <CaretDownOutlined style={{ fontSize: 11 }} />
                  ) : (
                    <CaretRightOutlined style={{ fontSize: 11 }} />
                  )}
                </span>
              ) : (
                <span className="analytics-revenue-expand-spacer" aria-hidden />
              )}
              <Avatar
                size={28}
                src={REP_DEFS.find((r) => r.key === record.key)?.avatarUrl}
                alt={name}
                style={{ flexShrink: 0, backgroundColor: record.color }}
              >
                {personInitials(name)}
              </Avatar>
              <Text>{name}</Text>
            </Space>
          );
        },
      },
      ...view.periods.map((p, idx) => ({
        title: p,
        key: p,
        align: 'right' as const,
        width: REVENUE_BREAKDOWN_PERIOD_COL_WIDTH,
        render: (_: unknown, record: DisplayRow) => {
          const amount = coerceAmount(record.values[idx]);
          if (record.rowType === 'client') {
            return (
              <ServiceFeeBreakdownCell
                serviceFeeTotal={amount}
                clientId={clientIdForDisplayRow(record)}
                muted
              />
            );
          }
          return <Text>{formatMoney(amount)}</Text>;
        },
      })),
      {
        title: 'Grand Total',
        key: 'total',
        align: 'right' as const,
        width: 140,
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'client') {
            return (
              <ServiceFeeBreakdownCell
                serviceFeeTotal={record.total}
                clientId={clientIdForDisplayRow(record)}
                muted
              />
            );
          }
          return <Text strong>{formatMoney(record.total)}</Text>;
        },
      },
    ],
    [expandedRepKeys, filterScopeKey, selectedClientIds, toggleRepExpanded, view.periods],
  );

  const multiChartMax = useMemo(
    () => maxPlottedRepSeries(view.byRep, activeSalesKeys, hiddenSalesTrendKeys, selectedClientIds),
    [activeSalesKeys, hiddenSalesTrendKeys, selectedClientIds, view.byRep],
  );

  const viewTotal = useMemo(
    () => view.system.reduce((a, b) => a + coerceAmount(b), 0),
    [view.system],
  );

  const primaryTotal = useMemo(
    () => primarySeries.reduce((a, b) => a + coerceAmount(b), 0),
    [primarySeries],
  );

  const feeProfileForScope = useMemo(() => {
    if (!isAllClientsSelected(selectedClientIds) && selectedClientIds.length === 1) {
      return feeProfileForClientId(selectedClientIds[0]);
    }
    const ids = isAllClientsSelected(selectedClientIds) ? CLIENT_IDS : selectedClientIds;
    return blendFeeProfiles(ids.map((id) => feeProfileForClientId(id)));
  }, [selectedClientIds]);

  const cashBreakdown = useMemo(
    () => splitServiceFeeTotal(primaryTotal, feeProfileForScope),
    [feeProfileForScope, primaryTotal],
  );

  const totalTrendData = useMemo(
    () =>
      view.periods.map((p, i) => {
        const revenue = coerceAmount(primarySeries[i]);
        const { equity, cash } = splitServiceFeeTotal(revenue, feeProfileForScope);
        return { period: p, revenue, equity, cash };
      }),
    [feeProfileForScope, primarySeries, view.periods],
  );

  const totalChartMax = useMemo(() => {
    let max = 0;
    for (const row of totalTrendData) {
      max = Math.max(max, row.revenue, row.cash, row.equity);
    }
    return max;
  }, [totalTrendData]);

  const topRep = useMemo(() => {
    const candidates = isAllReps
      ? tableRows
      : tableRows.filter((r) => activeSalesKeys.includes(r.key));
    if (candidates.length === 0) return { key: null as RepKey | null, name: '—', value: 0 };
    const best = candidates.reduce((a, b) => (b.total > a.total ? b : a));
    return { key: best.key, name: best.name, value: best.total };
  }, [activeSalesKeys, isAllReps, tableRows]);

  const topRepMeta = useMemo(
    () => (topRep.key ? REP_DEFS.find((r) => r.key === topRep.key) ?? null : null),
    [topRep.key],
  );

  const selectedRepMeta = useMemo(
    () => (isSingleRep ? REP_DEFS.find((r) => r.key === selectedSalesKeys[0]) ?? null : null),
    [isSingleRep, selectedSalesKeys],
  );

  const visibleClientTrendDefs = useMemo(
    () => clientsVisibleForSales(selectedClientIds, activeSalesKeys),
    [activeSalesKeys, selectedClientIds],
  );

  const clientRankRows = useMemo(
    () =>
      visibleClientTrendDefs
        .map((client) => {
          const raw = view.byClient[client.key] ?? [];
          const total = raw.reduce((sum, value) => sum + value, 0);
          const ownerKey = CLIENT_OWNER[client.key];
          const sales = REP_DEFS.find((r) => r.key === ownerKey)?.name ?? '—';
          return {
            key: client.key,
            name: client.name,
            sales,
            color: client.color,
            total,
            series: raw,
          };
        })
        .filter((row) => row.total > 0)
        .sort((a, b) => b.total - a.total)
        .map((row, index) => {
          const rank = index + 1;
          const series = DEMO_DECLINING_CLIENT_RANKS.has(rank)
            ? shapeDecliningClientSeries(row.series)
            : row.series;
          return {
            ...row,
            rank,
            series,
            rangeChangePct: computeRangeChangePct(series),
          };
        }),
    [filterScopeKey, visibleClientTrendDefs, view.byClient],
  );

  const clientScopeLabel = useMemo(
    () => formatClientScopeLabel(selectedClientIds),
    [selectedClientIds],
  );

  const newLogoMonthRange = useMemo(() => {
    const indices = DEMO_MONTHS.map((month, i) => ({ month, i }))
      .filter(({ month }) => monthInRange(month, normalizedMonthRange))
      .map(({ i }) => i);
    if (indices.length === 0) return null;
    return { startIdx: indices[0]!, endIdx: indices[indices.length - 1]! };
  }, [normalizedMonthRange]);

  const newLogoClientRows = useMemo(() => {
    if (!newLogoMonthRange) return [];
    const { startIdx, endIdx } = newLogoMonthRange;

    return CLIENT_DEFS.filter((client) => {
      if (!isNewLogoClientInRange(client.key, startIdx, endIdx)) return false;
      if (!activeSalesKeys.includes(CLIENT_OWNER[client.key])) return false;
      if (!isAllClientsSelected(selectedClientIds) && !selectedClientIds.includes(client.key)) {
        return false;
      }
      return true;
    })
      .map((client) => {
        const rawValues = view.byClient[client.key] ?? [];
        const values = isNewLogoClientZeroRevenue(client.key)
          ? rawValues.map(() => 0)
          : rawValues;
        const total = values.reduce((sum, value) => sum + coerceAmount(value), 0);
        const ownerKey = CLIENT_OWNER[client.key];
        const salesName = REP_DEFS.find((r) => r.key === ownerKey)?.name ?? '—';
        return {
          key: client.key,
          name: client.name,
          salesName,
          color: client.color,
          logoUrl: client.logoUrl,
          values,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [
    activeSalesKeys,
    newLogoMonthRange,
    selectedClientIds,
    view.byClient,
  ]);

  const newLogoPeriodTotals = useMemo(
    () =>
      view.periods.map((_, idx) =>
        newLogoClientRows.reduce((sum, row) => sum + coerceAmount(row.values[idx]), 0),
      ),
    [newLogoClientRows, view.periods],
  );

  const newLogoGrandTotal = useMemo(
    () => newLogoClientRows.reduce((sum, row) => sum + row.total, 0),
    [newLogoClientRows],
  );

  const shareOfTeam =
    isSingleRep && viewTotal > 0 ? Math.round((primaryTotal / viewTotal) * 1000) / 10 : null;

  const presaleEffort = useMemo(() => {
    const indices = DEMO_MONTHS.map((month, i) => ({ month, i }))
      .filter(({ month }) => monthInRange(month, normalizedMonthRange))
      .map(({ i }) => i);
    const hours = sumPresaleHours(indices, activeSalesKeys);
    return presaleEffortFromHours(hours);
  }, [activeSalesKeys, normalizedMonthRange]);

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
      },
      {
        key: 'equity',
        title: 'Equity',
        value: `$${cashBreakdown.equity.toLocaleString('en-US')}`,
        valueVariant: 'metric',
      },
      {
        key: 'cash',
        title: 'Cash',
        valueBreakdown: { paid: cashBreakdown.paid, unpaid: cashBreakdown.unpaid },
        value: `$${cashBreakdown.cash.toLocaleString('en-US')}`,
        valueVariant: 'metric',
      },
      {
        key: 'top-or-share',
        title: isSingleRep ? 'Share of team' : 'Top Sales Rep',
        value: isSingleRep ? `${shareOfTeam ?? 0}%` : personFirstName(topRep.name),
        valueTitle: isSingleRep ? undefined : topRep.name,
        valueVariant: isSingleRep ? 'metric' : 'person',
        avatar:
          !isSingleRep && topRepMeta ? (
            <Avatar
              size={32}
              src={topRepMeta.avatarUrl}
              alt={topRepMeta.name}
              style={{ flexShrink: 0, backgroundColor: topRepMeta.color }}
            >
              {personInitials(topRepMeta.name)}
            </Avatar>
          ) : undefined,
        rightLabel: isSingleRep ? formatMoneyValue(viewTotal) : formatMoneyValue(topRep.value),
        rightLabelTone: isSingleRep ? 'positive' : 'default',
      },
      {
        key: 'presale-effort',
        title: 'Presale Effort',
        value: presaleEffort.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        unit: 'Man/Month',
        valueVariant: 'metric',
      },
    ],
    [cashBreakdown, isSingleRep, presaleEffort, primaryTotal, shareOfTeam, topRep, topRepMeta, viewTotal],
  );

  return (
    <DashboardShell selectedMenuKey="billing-dashboard">
      <div className="revenue-analytics-page">
        <div className="revenue-analytics-page__sticky">
        <div className="revenue-analytics-page__crumb">
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
                <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>Revenue Analytics</Text>
              </Space>
            </Space>
        </div>

        <Card
          bordered
          className="revenue-analytics-page__filters"
          styles={{ body: { padding: '16px 18px 14px' } }}
        >
          <div className="revenue-analytics-page__filters-inner">
            <div className="revenue-analytics-page__filters-date-group">
              <MonthRangePicker
                value={monthRange}
                activePreset={activePreset}
                referenceDate={REPORTING_END}
                onChange={(next, preset) => {
                  setMonthRange(normalizeMonthRange(next));
                  setActivePreset(preset ?? null);
                }}
              />
              <span className="revenue-analytics-page__filters-divider" aria-hidden />
            </div>
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
        </div>

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
                {`Revenue for ${clientScopeLabel} — Cash, Equity, and Total Revenue trends ($)`}
              </Text>
            ) : null
          ) : (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              {`${isSingleRep ? selectedRepMeta?.name : formatSalesFilterLabel(selectedSalesKeys)}${clientScopeLabel ? ` · ${clientScopeLabel}` : ''} · revenue ($) in this view — team total in same view: ${formatMoneyValue(viewTotal)}`}
            </Text>
          )}
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer key={`total-${filterScopeKey}`}>
              <LineChart data={totalTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e8e8e8' }} />
                <YAxis
                  tickFormatter={(v) => axisMoneyShort(Number(v))}
                  domain={[0, yAxisMaxFromDataMax(totalChartMax)]}
                  tick={{ fontSize: 12 }}
                  width={56}
                  axisLine={{ stroke: '#e8e8e8' }}
                />
                <RTooltip
                  content={({ active, payload, label }) => (
                    <TotalRevenueTrendTooltip active={active} payload={payload} label={label} />
                  )}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="cash"
                  name="Cash"
                  stroke={TREND_CASH_COLOR}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: TREND_CASH_COLOR }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  name="Equity"
                  stroke={TREND_EQUITY_COLOR}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: TREND_EQUITY_COLOR }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Total Revenue"
                  stroke={TREND_TOTAL_LINE_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: TREND_TOTAL_LINE_COLOR }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 16, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '18px 18px 8px' } }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontWeight: 600, color: '#1f1f1f' }}>
            Revenue By
          </Title>
          <div className="analytics-revenue-by-toggle" role="tablist" aria-label="Revenue By view">
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
          <div
            style={{
              width: '100%',
              minHeight: 340,
              height: revenueTrendView === 'sales' ? 340 : undefined,
            }}
          >
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
                    domain={[0, yAxisMaxFromDataMax(multiChartMax)]}
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
              <RevenueByClientRankList
                key={`client-rank-${filterScopeKey}`}
                rows={clientRankRows}
                periods={view.periods}
                filterScopeKey={filterScopeKey}
              />
            )}
          </div>
        </Card>

        <ClientCollectionChartCard
          filterScopeKey={filterScopeKey}
          periodCount={view.periods.length}
          selectedSalesKeys={selectedSalesKeys}
          selectedClientIds={selectedClientIds}
        />

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '18px 18px 18px' } }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            Revenue Breakdown
            {clientScopeLabel ? (
              <Text type="secondary" style={{ fontWeight: 400, marginLeft: 6 }}>
                · {clientScopeLabel}
              </Text>
            ) : null}
          </Title>
          <div className="analytics-revenue-table-scroll">
            <Table<DisplayRow>
            key={filterScopeKey}
            className="analytics-revenue-table"
            rowKey="key"
            columns={columns}
            scroll={{ x: revenueTableScrollX }}
            dataSource={displayTableRows}
            rowClassName={(record) => {
              if (record.rowType === 'client') return 'analytics-revenue-client-row';
              return repRowExpandable(record, selectedClientIds)
                ? 'analytics-revenue-rep-row analytics-revenue-rep-row--expandable'
                : 'analytics-revenue-rep-row';
            }}
            onRow={(record) => {
              if (record.rowType !== 'rep' || !repRowExpandable(record, selectedClientIds)) {
                return {};
              }
              const expanded = expandedRepKeys.includes(record.key);
              return {
                onClick: () => toggleRepExpanded(record.key),
                style: { cursor: 'pointer' },
                'aria-expanded': expanded,
                'aria-label': expanded
                  ? `Collapse client breakdown for ${record.name}`
                  : `Expand client breakdown for ${record.name}`,
              };
            }}
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
                        <Table.Summary.Cell index={0} align="right">
                          <Text strong>Revenue Total</Text>
                        </Table.Summary.Cell>
                        {view.periods.map((p, idx) => (
                          <Table.Summary.Cell key={p} index={idx + 1} align="right">
                            <Text strong>{formatMoney(view.system[idx])}</Text>
                          </Table.Summary.Cell>
                        ))}
                        <Table.Summary.Cell index={view.periods.length + 1} align="right">
                          <Text strong>{formatMoney(viewTotal)}</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )
                : undefined
            }
          />
          </div>
        </Card>

        <NewLogosBreakdownTable
          filterScopeKey={filterScopeKey}
          periods={view.periods}
          clientRows={newLogoClientRows}
          periodTotals={newLogoPeriodTotals}
          grandTotal={newLogoGrandTotal}
          clientScopeLabel={clientScopeLabel}
        />
      </div>
    </DashboardShell>
  );
}
