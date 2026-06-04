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
import { RevenueAnalyticsSummaryPanel } from '../components/RevenueAnalyticsSummaryPanel';
import { EorBillingSummaryPanel } from '../components/EorBillingSummaryPanel';
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
import { COLLECTION_CLIENT_GROUPS } from '../data/collectionClientDemo';
import { NewLogosBreakdownTable } from '../components/NewLogosBreakdownTable';
import {
  REVENUE_GRAND_TOTAL_COL_WIDTH,
  REVENUE_PERIOD_COL_MIN_WIDTH,
  REVENUE_PROJECT_NAME_INDENT,
  REVENUE_SALES_REP_COL_WIDTH,
  revenueTableScrollWidth,
} from '../constants/revenueTableLayout';
import {
  expandedProjectTableCellProps,
  RevenueExpandedProjectGrid,
} from '../components/RevenueExpandedProjectGrid';
import {
  buildRevenueDetailProjectRow,
  type RevenueDetailProjectRow,
} from '../utils/revenueTableDetailLines';
import {
  isNewLogoClientInRange,
  isNewLogoClientZeroRevenue,
  isNewLogoEorDemoClient,
  newLogoEorDemoValues,
  projectsForNewLogoClient,
} from '../data/newLogoDemo';
import { RevenueByClientRankList } from '../components/RevenueByClientRankList';
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
import {
  RevenueAnalyticsSectionTabs,
  type RevenueAnalyticsSection,
} from '../components/RevenueAnalyticsSectionTabs';
import { DashboardShell } from '../layout/DashboardShell';
import { presaleEffortFromHours, sumPresaleHours } from '../data/presaleDemoHours';
import {
  eorRevenueFractionForClient,
  isClientInEorScope,
  scaleAmountForEor,
} from '../data/eorProjectDemo';
import { buildEorBillingTableData, summarizeEorBilling } from '../data/eorBillingDemo';
import { EorBillingOverviewChartCard } from '../components/EorBillingOverviewChartCard';
import { EorBillingTrendChartCard } from '../components/EorBillingTrendChartCard';
import { EorBillingBreakdownTable } from '../components/EorBillingBreakdownTable';
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

function monthlyByRepForClients(
  clientIds: ClientFilter,
  eorOnly: boolean,
): Record<RepKey, number[]> {
  if (!eorOnly && isAllClientsSelected(clientIds)) {
    return Object.fromEntries(REP_KEYS.map((k) => [k, [...BREAKDOWN[k]]])) as Record<RepKey, number[]>;
  }

  const merged = Object.fromEntries(
    REP_KEYS.map((k) => [k, PERIODS.map(() => 0)]),
  ) as Record<RepKey, number[]>;
  const idsToInclude = isAllClientsSelected(clientIds) ? CLIENT_IDS : clientIds;

  for (const id of idsToInclude) {
    const owner = CLIENT_OWNER[id];
    const scale = eorOnly ? eorRevenueFractionForClient(id) : 1;
    for (let i = 0; i < PERIODS.length; i++) {
      merged[owner][i] += scaleAmountForEor(CLIENT_MONTHLY_BASE[id][i], scale);
    }
  }

  return merged;
}

function monthlyByClientForClients(
  clientIds: ClientFilter,
  eorOnly: boolean,
): Record<ClientId, number[]> {
  return Object.fromEntries(
    CLIENT_IDS.map((id) => {
      const values = [...CLIENT_MONTHLY_BASE[id]];
      if (!isAllClientsSelected(clientIds) && !clientIds.includes(id)) {
        return [id, PERIODS.map(() => 0)];
      }
      const scale = eorOnly ? eorRevenueFractionForClient(id) : 1;
      return [id, values.map((v) => scaleAmountForEor(v, scale))];
    }),
  ) as Record<ClientId, number[]>;
}

function clientFilterNote(clientIds: ClientFilter, eorOnly: boolean): string | undefined {
  const parts: string[] = [];
  if (eorOnly) parts.push('EOR projects only');
  if (!isAllClientsSelected(clientIds)) {
    const labels = clientIds.map((id) => CLIENTS.find((c) => c.id === id)?.name ?? id);
    parts.push(`Client / project: ${labels.join(', ')}`);
  }
  if (parts.length === 0) return undefined;
  return `${parts.join(' · ')} (demo)`;
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
  eorOnly: boolean,
): BuiltView {
  const monthly = monthlyByRepForClients(clientIds, eorOnly);
  const monthlyClients = monthlyByClientForClients(clientIds, eorOnly);
  const baseNote = clientFilterNote(clientIds, eorOnly);
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


type RevenueBreakdownRow = {
  key: RepKey;
  name: string;
  color: string;
  values: number[];
  total: number;
};

type ClientRevenueLine = { name: string; revenue: number };

function clientsForRepBreakdown(repKey: RepKey, eorOnly: boolean) {
  return DEMO_CLIENT_CATALOG.filter(
    (c) => c.owner === repKey && (!eorOnly || isClientInEorScope(c.id)),
  ).map((c) => ({ name: c.name, weight: c.weight }));
}

function splitAmountByClients(
  amount: number,
  clients: readonly { name: string; weight: number }[],
): ClientRevenueLine[] {
  if (clients.length === 0) return [];
  if (amount <= 0) {
    return clients.map((c) => ({ name: c.name, revenue: 0 }));
  }
  const totalWeight = clients.reduce((s, c) => s + c.weight, 0);
  let remaining = amount;
  return clients.map((c, i) => {
    if (i === clients.length - 1) {
      return { name: c.name, revenue: remaining };
    }
    const share = Math.round((amount * c.weight) / totalWeight);
    remaining -= share;
    return { name: c.name, revenue: share };
  });
}

function breakdownForCell(
  repKey: RepKey,
  amount: number,
  clientIds: ClientFilter,
  eorOnly: boolean,
): ClientRevenueLine[] {
  if (amount === 0) return [];
  if (isAllClientsSelected(clientIds)) {
    return splitAmountByClients(amount, clientsForRepBreakdown(repKey, eorOnly));
  }

  const owned = clientIds.filter((id) => CLIENT_OWNER[id] === repKey);
  if (owned.length === 0) return [];
  if (owned.length === 1) {
    const clientId = owned[0]!;
    if (eorOnly && eorRevenueFractionForClient(clientId) <= 0) return [];
    const client = CLIENTS.find((c) => c.id === clientId);
    return [{ name: client?.name ?? clientId, revenue: amount }];
  }

  const clients = owned
    .filter((id) => !eorOnly || isClientInEorScope(id))
    .map((id) => ({
      name: CLIENTS.find((c) => c.id === id)?.name ?? id,
      weight: CLIENT_TAKE_OF_OWNER[id] ?? 1,
    }));
  return splitAmountByClients(amount, clients);
}

function breakdownForRowTotal(
  repKey: RepKey,
  values: number[],
  clientIds: ClientFilter,
  eorOnly: boolean,
): ClientRevenueLine[] {
  const totals = new Map<string, number>();
  values.forEach((amount) => {
    breakdownForCell(repKey, amount, clientIds, eorOnly).forEach(({ name, revenue }) => {
      totals.set(name, (totals.get(name) ?? 0) + revenue);
    });
  });
  return [...totals.entries()].map(([name, revenue]) => ({ name, revenue }));
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
  eorOnly: boolean,
): ClientBreakdownRow[] {
  const lines = breakdownForRowTotal(repKey, values, clientIds, eorOnly);
  if (lines.length === 0) return [];

  return lines.map(({ name }) => {
    const childValues = values.map((amount) => {
      const cellLines = breakdownForCell(repKey, amount, clientIds, eorOnly);
      return cellLines.find((line) => line.name === name)?.revenue ?? 0;
    });
    const matchedClient = CLIENTS.find((c) => c.name === name);
    return {
      key: `${repKey}::${name}`,
      name,
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
  revenueOnly = false,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TotalTrendPoint }>;
  label?: string | number;
  revenueOnly?: boolean;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const total = coerceAmount(point.revenue);

  if (revenueOnly) {
    return (
      <div style={chartTooltipShellStyle}>
        <div style={{ fontWeight: 600, color: '#262626', marginBottom: 10, fontSize: 13 }}>{label}</div>
        <ChartTooltipSeriesRow color={TREND_TOTAL_LINE_COLOR} name="Revenue" amount={total} />
      </div>
    );
  }

  const equity = coerceAmount(point.equity);
  const cash = coerceAmount(point.cash);

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
type DisplayRow = RepTableRow | ClientTableRow | RevenueDetailProjectRow;

function isDetailProjectRow(record: DisplayRow): record is RevenueDetailProjectRow {
  return record.rowType === 'detail-project';
}

function repRowExpandable(record: RepTableRow, selectedClientIds: ClientFilter, eorOnly: boolean) {
  return clientRowsForRep(record.key, record.values, selectedClientIds, eorOnly).length > 0;
}

export default function SalesRevenueAnalyticsPage() {
  const [monthRange, setMonthRange] = useState<MonthRangeValue>(() => resolveMonthPreset('ytd', REPORTING_END));
  const [activePreset, setActivePreset] = useState<QuickPresetKey | null>('ytd');
  const [selectedSalesKeys, setSelectedSalesKeys] = useState<SalesFilter>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<ClientFilter>([]);
  const eorOnly = false;
  const [analyticsSection, setAnalyticsSection] =
    useState<RevenueAnalyticsSection>('revenue-analytic');
  const [expandedRepKeys, setExpandedRepKeys] = useState<RepKey[]>([]);
  const [revenueTrendView, setRevenueTrendView] = useState<'sales' | 'client'>(() => {
    const trend = new URLSearchParams(window.location.search).get('trend');
    return trend === 'client' ? 'client' : 'sales';
  });

  const normalizedMonthRange = useMemo(() => normalizeMonthRange(monthRange), [monthRange]);
  const rangeLabel = activePreset ? PRESET_LABELS[activePreset] : formatMonthRangeLabel(normalizedMonthRange);
  const monthStartKey = normalizedMonthRange.start.format('YYYY-MM');
  const monthEndKey = normalizedMonthRange.end.format('YYYY-MM');
  const filterScopeKey = `${monthStartKey}|${monthEndKey}|${selectedClientIds.join(',')}|${selectedSalesKeys.join(',')}|eor:${eorOnly}`;

  const view = useMemo(
    () =>
      buildResolvedView(
        monthRangeFromKeys(monthStartKey, monthEndKey),
        selectedClientIds,
        selectedSalesKeys,
        rangeLabel,
        eorOnly,
      ),
    [eorOnly, monthEndKey, monthStartKey, rangeLabel, selectedClientIds, selectedSalesKeys],
  );

  /** Full-team rep totals for Top Sales Rep card (ignores sales filter). */
  const teamScopedView = useMemo(
    () =>
      buildResolvedView(
        monthRangeFromKeys(monthStartKey, monthEndKey),
        selectedClientIds,
        [],
        rangeLabel,
        eorOnly,
      ),
    [eorOnly, monthEndKey, monthStartKey, rangeLabel, selectedClientIds],
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
      for (const client of clientRowsForRep(rep.key, rep.values, selectedClientIds, eorOnly)) {
        const detailRow = buildRevenueDetailProjectRow({
          rowKeyPrefix: client.key,
          parentKey: rep.key,
          entityName: client.name,
          nameIndent: REVENUE_PROJECT_NAME_INDENT,
          periodValues: client.values,
          rowTotal: client.total,
          clientId: client.clientId,
          showZeroAmount: true,
          revenueOnly: eorOnly,
          eorProject: false,
        });
        if (detailRow) {
          rows.push(detailRow);
        } else {
          rows.push({ ...client, rowType: 'client', parentKey: rep.key });
        }
      }
    }
    return rows;
  }, [eorOnly, expandedRepKeys, filteredTableRows, selectedClientIds]);

  const revenueTableScrollX = useMemo(
    () => revenueTableScrollWidth(view.periods.length),
    [view.periods.length],
  );

  const revenueBreakdownColumnCount = view.periods.length + 2;

  const columns: TableColumnsType<DisplayRow> = useMemo(
    () => {
      const projectCellProps = (record: DisplayRow, columnKey: string) =>
        expandedProjectTableCellProps(record, columnKey, 'name', revenueBreakdownColumnCount);

      return [
      {
        title: 'Sales Representative',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: REVENUE_SALES_REP_COL_WIDTH,
        onCell: (record) => projectCellProps(record, 'name'),
        render: (name: string, record) => {
          if (isDetailProjectRow(record)) {
            return <RevenueExpandedProjectGrid record={record} periodCount={view.periods.length} />;
          }

          if (record.rowType === 'client') {
            return (
              <Text
                type="secondary"
                className="analytics-revenue-table__client-indent"
                style={{ display: 'block', fontSize: 13 }}
              >
                {name}
              </Text>
            );
          }

          const expandable = repRowExpandable(record, selectedClientIds, eorOnly);
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
              <Text className="analytics-revenue-table__name">{name}</Text>
            </Space>
          );
        },
      },
      ...view.periods.map((p, idx) => ({
        title: p,
        key: p,
        align: 'right' as const,
        minWidth: REVENUE_PERIOD_COL_MIN_WIDTH,
        onCell: (record: DisplayRow) => projectCellProps(record, p),
        render: (_: unknown, record: DisplayRow) => {
          if (isDetailProjectRow(record)) return null;
          const amount = coerceAmount(record.values[idx]);
          if (record.rowType === 'client') {
            return (
              <Text strong={false} type="secondary">
                {formatMoney(amount)}
              </Text>
            );
          }
          return <Text>{formatMoney(amount)}</Text>;
        },
      })),
      {
        title: 'Grand Total',
        key: 'total',
        align: 'right' as const,
        width: REVENUE_GRAND_TOTAL_COL_WIDTH,
        onCell: (record) => projectCellProps(record, 'total'),
        render: (_: unknown, record: DisplayRow) => {
          if (isDetailProjectRow(record)) return null;
          if (record.rowType === 'client') {
            return (
              <Text type="secondary">{formatMoney(record.total)}</Text>
            );
          }
          return <Text strong>{formatMoney(record.total)}</Text>;
        },
      },
    ];
    },
    [eorOnly, expandedRepKeys, revenueBreakdownColumnCount, selectedClientIds, view.periods],
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
    () => splitServiceFeeTotal(primaryTotal, feeProfileForScope, eorOnly),
    [eorOnly, feeProfileForScope, primaryTotal],
  );

  const totalTrendData = useMemo(
    () =>
      view.periods.map((p, i) => {
        const revenue = coerceAmount(primarySeries[i]);
        if (eorOnly) {
          return { period: p, revenue, equity: 0, cash: 0 };
        }
        const { equity, cash } = splitServiceFeeTotal(revenue, feeProfileForScope);
        return { period: p, revenue, equity, cash };
      }),
    [eorOnly, feeProfileForScope, primarySeries, view.periods],
  );

  const totalChartMax = useMemo(() => {
    let max = 0;
    for (const row of totalTrendData) {
      max = eorOnly ? Math.max(max, row.revenue) : Math.max(max, row.revenue, row.cash, row.equity);
    }
    return max;
  }, [eorOnly, totalTrendData]);

  const topRep = useMemo(() => {
    let best = { key: null as RepKey | null, name: '—', value: 0 };
    for (const r of REP_DEFS) {
      const total = teamScopedView.byRep[r.key].reduce((sum, v) => sum + coerceAmount(v), 0);
      if (total > best.value) {
        best = { key: r.key, name: r.name, value: total };
      }
    }
    return best;
  }, [teamScopedView.byRep]);

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
        .filter((client) => !eorOnly || isClientInEorScope(client.key))
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
    [eorOnly, filterScopeKey, visibleClientTrendDefs, view.byClient],
  );

  const clientScopeLabel = useMemo(
    () => formatClientScopeLabel(selectedClientIds),
    [selectedClientIds],
  );

  const collectionDrillKey = useMemo(() => {
    const drill = new URLSearchParams(window.location.search).get('drill');
    if (!drill) return null;
    return COLLECTION_CLIENT_GROUPS.some((g) => g.key === drill) ? drill : null;
  }, []);

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
        const values =
          eorOnly && isNewLogoEorDemoClient(client.key)
            ? newLogoEorDemoValues(client.key, startIdx, endIdx)
            : isNewLogoClientZeroRevenue(client.key)
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
      .filter((row) => {
        if (!eorOnly) return true;
        if (isNewLogoEorDemoClient(row.key)) {
          return projectsForNewLogoClient(row.key).some((p) => p.eor);
        }
        return isClientInEorScope(row.key) && projectsForNewLogoClient(row.key).some((p) => p.eor);
      })
      .sort((a, b) => b.total - a.total);
  }, [
    activeSalesKeys,
    eorOnly,
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

  const eorBillingRange = useMemo(() => {
    const indices = DEMO_MONTHS.map((month, i) => ({ month, i }))
      .filter(({ month }) => monthInRange(month, normalizedMonthRange))
      .map(({ i }) => i);
    return {
      startIdx: indices[0] ?? 0,
      endIdx: indices[indices.length - 1] ?? 0,
    };
  }, [filterScopeKey, normalizedMonthRange]);

  const eorBillingSummary = useMemo(
    () =>
      summarizeEorBilling({
        rangeStartIdx: eorBillingRange.startIdx,
        rangeEndIdx: eorBillingRange.endIdx,
        clientIds: selectedClientIds,
        salesKeys: activeSalesKeys,
      }),
    [activeSalesKeys, eorBillingRange.endIdx, eorBillingRange.startIdx, selectedClientIds],
  );

  const eorSecurityDepositAllTime = useMemo(
    () =>
      summarizeEorBilling({
        rangeStartIdx: 0,
        rangeEndIdx: DEMO_MONTH_COUNT - 1,
        clientIds: selectedClientIds,
        salesKeys: activeSalesKeys,
      }).credit,
    [activeSalesKeys, selectedClientIds],
  );

  const eorBillingPeriods = useMemo(() => {
    const indices = DEMO_MONTHS.map((month, i) => ({ month, i }))
      .filter(({ month }) => monthInRange(month, normalizedMonthRange))
      .map(({ i }) => i);
    return indices.map((i) => PERIODS[i] ?? DEMO_MONTHS[i]!.format('MMM YY'));
  }, [filterScopeKey, normalizedMonthRange]);

  const eorBillingTableData = useMemo(
    () =>
      buildEorBillingTableData({
        rangeStartIdx: eorBillingRange.startIdx,
        rangeEndIdx: eorBillingRange.endIdx,
        clientIds: selectedClientIds,
        salesKeys: activeSalesKeys,
      }),
    [
      activeSalesKeys,
      eorBillingRange.endIdx,
      eorBillingRange.startIdx,
      selectedClientIds,
      filterScopeKey,
    ],
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
                <Text style={{ color: '#1f1f1f', fontWeight: 500 }}>Billing Analytics</Text>
              </Space>
            </Space>
        </div>

        <Card
          bordered
          className="revenue-analytics-page__filters"
          styles={{ body: { padding: '16px 18px 14px' } }}
        >
          <div className="revenue-analytics-page__filters-inner">
            <div className="revenue-analytics-page__filters-left">
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
            <RevenueAnalyticsSectionTabs value={analyticsSection} onChange={setAnalyticsSection} />
          </div>
        </Card>
        </div>

        {analyticsSection === 'revenue-analytic' ? (
          <>
        <RevenueAnalyticsSummaryPanel
          totalRevenue={primaryTotal}
          totalRevenueLabel={eorOnly ? 'EOR Revenue' : 'Total Revenue'}
          breakdown={cashBreakdown}
          eorOnly={eorOnly}
          topRepName={personFirstName(topRep.name)}
          topRepValue={topRep.value}
          topRepMeta={topRepMeta}
          presaleEffort={presaleEffort}
        />

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '18px 18px 8px' } }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            Total Revenue Trend
          </Title>
          {eorOnly ? (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              EOR project revenue only — no Equity or Cash composition ($)
            </Text>
          ) : isAllReps ? (
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
                    <TotalRevenueTrendTooltip
                      active={active}
                      payload={payload}
                      label={label}
                      revenueOnly={eorOnly}
                    />
                  )}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {!eorOnly ? (
                  <>
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
                  </>
                ) : null}
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name={eorOnly ? 'Revenue' : 'Total Revenue'}
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
          eorOnly={eorOnly}
          initialDrillKey={collectionDrillKey}
        />

        <Card
          bordered
          style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
          styles={{ body: { padding: '18px 18px 18px' } }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            Revenue Breakdown
            {!eorOnly && clientScopeLabel ? (
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
            sticky
            scroll={{ x: revenueTableScrollX }}
            dataSource={displayTableRows}
            rowClassName={(record) => {
              if (isDetailProjectRow(record)) return 'analytics-revenue-expanded-project-row';
              if (record.rowType === 'client') return 'analytics-revenue-detail-row';
              return repRowExpandable(record, selectedClientIds, eorOnly)
                ? 'analytics-revenue-rep-row analytics-revenue-rep-row--expandable'
                : 'analytics-revenue-rep-row';
            }}
            onRow={(record) => {
              if (record.rowType !== 'rep' || !repRowExpandable(record, selectedClientIds, eorOnly)) {
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
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} align="right" className="analytics-revenue-table__summary-first">
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
          revenueOnly={eorOnly}
        />
          </>
        ) : (
          <>
            <EorBillingSummaryPanel
              summary={eorBillingSummary}
              securityDepositAllTime={eorSecurityDepositAllTime}
            />
            <EorBillingTrendChartCard
              filterScopeKey={filterScopeKey}
              rangeStartIdx={eorBillingRange.startIdx}
              rangeEndIdx={eorBillingRange.endIdx}
              selectedClientIds={selectedClientIds}
              selectedSalesKeys={activeSalesKeys}
            />
            <EorBillingOverviewChartCard
              filterScopeKey={filterScopeKey}
              rangeStartIdx={eorBillingRange.startIdx}
              rangeEndIdx={eorBillingRange.endIdx}
              selectedClientIds={selectedClientIds}
              selectedSalesKeys={activeSalesKeys}
            />
            <EorBillingBreakdownTable
              filterScopeKey={filterScopeKey}
              rangeStartIdx={eorBillingRange.startIdx}
              rangeEndIdx={eorBillingRange.endIdx}
              selectedClientIds={selectedClientIds}
              selectedSalesKeys={activeSalesKeys}
              periods={eorBillingPeriods}
              clientRows={eorBillingTableData.clients}
              periodTotals={eorBillingTableData.periodTotals}
              grandTotal={eorBillingTableData.grandTotal}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
