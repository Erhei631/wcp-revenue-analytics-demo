import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button, Card, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { THEME_PRIMARY } from '../constants/chartColors';

const { Text, Title } = Typography;

const FEE_EQUITY = THEME_PRIMARY;
const FEE_PAID = '#57CEF4';
const FEE_UNPAID = '#FFB800';
const DEMO_PERIOD_COUNT = 5;

type RepKey = 'alice' | 'bob' | 'carol' | 'david';

import {
  DEMO_CLIENT_IDS,
  type DemoClientId,
} from '../data/demoClientCatalog';

export type CollectionChartClientFilter = DemoClientId[];

type CollectionProjectDef = {
  key: string;
  name: string;
  weight: number;
};

type CollectionClientGroup = {
  key: string;
  label: string;
  owner: RepKey;
  /** Toolbar client filter id; omitted for demo-only clients shown only when unfiltered. */
  filterClientId?: DemoClientId;
  equity: number;
  paid: number;
  unpaid: number;
  projects: CollectionProjectDef[];
};

const COLLECTION_CLIENT_GROUPS: CollectionClientGroup[] = [
  {
    key: 'apex',
    label: 'Client Apex',
    owner: 'alice',
    filterClientId: 'apex',
    equity: 45_000,
    paid: 132_000,
    unpaid: 26_000,
    projects: [
      { key: 'apex-erp', name: 'ERP rollout', weight: 0.28 },
      { key: 'apex-saas', name: 'Northwind SaaS', weight: 0.22 },
      { key: 'apex-dw', name: 'Data warehouse', weight: 0.2 },
      { key: 'apex-support', name: 'Support retainer', weight: 0.18 },
      { key: 'apex-security', name: 'Security audit', weight: 0.12 },
    ],
  },
  {
    key: 'bolt',
    label: 'Client Bolt',
    owner: 'bob',
    filterClientId: 'bolt',
    equity: 28_000,
    paid: 84_000,
    unpaid: 8_000,
    projects: [
      { key: 'bolt-data', name: 'Data platform', weight: 0.4 },
      { key: 'bolt-analytics', name: 'Contoso Analytics', weight: 0.28 },
      { key: 'bolt-api', name: 'API gateway', weight: 0.2 },
      { key: 'bolt-monitor', name: 'Monitoring', weight: 0.12 },
    ],
  },
  {
    key: 'core',
    label: 'Client Core',
    owner: 'carol',
    filterClientId: 'core',
    equity: 40_000,
    paid: 112_000,
    unpaid: 23_000,
    projects: [
      { key: 'core-billing', name: 'Billing integration', weight: 0.3 },
      { key: 'core-support', name: 'Fabrikam Support', weight: 0.25 },
      { key: 'core-payments', name: 'Payment gateway', weight: 0.2 },
      { key: 'core-compliance', name: 'Compliance', weight: 0.15 },
      { key: 'core-training', name: 'Training', weight: 0.1 },
    ],
  },
  {
    key: 'dusk',
    label: 'Client Dusk',
    owner: 'david',
    filterClientId: 'dusk',
    equity: 24_000,
    paid: 68_000,
    unpaid: 12_000,
    projects: [
      { key: 'dusk-mobile', name: 'Mobile app', weight: 0.38 },
      { key: 'dusk-iot', name: 'Tailspin IoT', weight: 0.32 },
      { key: 'dusk-wearables', name: 'Wearables', weight: 0.18 },
      { key: 'dusk-push', name: 'Push notifications', weight: 0.12 },
    ],
  },
  {
    key: 'edge',
    label: 'Client Edge',
    owner: 'bob',
    equity: 28_000,
    paid: 82_000,
    unpaid: 10_000,
    projects: [
      { key: 'edge-cloud', name: 'Cloud migration', weight: 0.3 },
      { key: 'edge-ops', name: 'Ops dashboard', weight: 0.25 },
      { key: 'edge-devops', name: 'DevOps pipeline', weight: 0.2 },
      { key: 'edge-cost', name: 'Cost optimization', weight: 0.15 },
      { key: 'edge-dr', name: 'DR failover', weight: 0.1 },
    ],
  },
];

export type CollectionChartSalesFilter = RepKey[];

function isAllClientsSelected(clientIds: CollectionChartClientFilter) {
  return clientIds.length === 0 || clientIds.length === DEMO_CLIENT_IDS.length;
}

type CollectionBarRow = {
  key: string;
  label: string;
  equity: number;
  paid: number;
  unpaid: number;
  /** Cash = Invoice = Paid + Unpaid */
  cash: number;
  /** Service Fee Total = Equity + Cash */
  serviceFeeTotal: number;
};

function toBarRow(
  key: string,
  label: string,
  equity: number,
  paid: number,
  unpaid: number,
): CollectionBarRow {
  const cash = paid + unpaid;
  return {
    key,
    label,
    equity,
    paid,
    unpaid,
    cash,
    serviceFeeTotal: equity + cash,
  };
}

function money(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}

function axisMoneyShort(n: number) {
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function scaleForPeriod(amount: number, periodCount: number) {
  return Math.round(amount * (periodCount / DEMO_PERIOD_COUNT));
}

function splitByWeights(
  totalEquity: number,
  totalPaid: number,
  totalUnpaid: number,
  projects: CollectionProjectDef[],
): CollectionBarRow[] {
  const totalWeight = projects.reduce((s, p) => s + p.weight, 0);
  let equityLeft = totalEquity;
  let paidLeft = totalPaid;
  let unpaidLeft = totalUnpaid;

  return projects.map((project, index) => {
    const isLast = index === projects.length - 1;
    const equity = isLast ? equityLeft : Math.round((totalEquity * project.weight) / totalWeight);
    const paid = isLast ? paidLeft : Math.round((totalPaid * project.weight) / totalWeight);
    const unpaid = isLast ? unpaidLeft : Math.round((totalUnpaid * project.weight) / totalWeight);
    equityLeft -= equity;
    paidLeft -= paid;
    unpaidLeft -= unpaid;
    return toBarRow(project.key, project.name, equity, paid, unpaid);
  });
}

function isAllSalesSelected(salesKeys: CollectionChartSalesFilter) {
  return salesKeys.length === 0 || salesKeys.length === 4;
}

function matchesClientFilter(group: CollectionClientGroup, clientIds: CollectionChartClientFilter) {
  if (isAllClientsSelected(clientIds)) return true;
  if (!group.filterClientId) return false;
  return clientIds.includes(group.filterClientId);
}

function collectionGroupForClient(clientId: DemoClientId) {
  return COLLECTION_CLIENT_GROUPS.find((g) => g.filterClientId === clientId) ?? null;
}

function buildClientRows(
  periodCount: number,
  salesKeys: CollectionChartSalesFilter,
  clientIds: CollectionChartClientFilter,
): CollectionBarRow[] {
  const salesSet = new Set(salesKeys);
  const allSales = isAllSalesSelected(salesKeys);

  return COLLECTION_CLIENT_GROUPS.filter(
    (g) => (allSales || salesSet.has(g.owner)) && matchesClientFilter(g, clientIds),
  )
    .map((group) => {
      const equity = scaleForPeriod(group.equity, periodCount);
      const paid = scaleForPeriod(group.paid, periodCount);
      const unpaid = scaleForPeriod(group.unpaid, periodCount);
      return toBarRow(group.key, group.label, equity, paid, unpaid);
    })
    .filter((row) => row.serviceFeeTotal > 0);
}

function buildProjectRows(clientKey: string, periodCount: number): CollectionBarRow[] {
  const group = COLLECTION_CLIENT_GROUPS.find((g) => g.key === clientKey);
  if (!group) return [];

  const equity = scaleForPeriod(group.equity, periodCount);
  const paid = scaleForPeriod(group.paid, periodCount);
  const unpaid = scaleForPeriod(group.unpaid, periodCount);
  return splitByWeights(equity, paid, unpaid, group.projects);
}

const chartTooltipShellStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '12px 14px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  minWidth: 220,
  pointerEvents: 'auto',
};

const chartTooltipDividerStyle: CSSProperties = {
  height: 1,
  background: '#f0f0f0',
  margin: '10px 0',
};

function CollectionTooltip({
  active,
  payload,
  canDrillToProjects,
  onProjectDetails,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CollectionBarRow }>;
  canDrillToProjects?: boolean;
  onProjectDetails?: (row: CollectionBarRow) => void;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const isClientBar = COLLECTION_CLIENT_GROUPS.some((g) => g.key === row.key);
  const showProjectDetails = Boolean(canDrillToProjects && isClientBar && onProjectDetails);

  return (
    <div style={chartTooltipShellStyle}>
      <div
        style={{
          fontWeight: 600,
          color: '#262626',
          fontSize: 13,
          paddingBottom: 10,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {row.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, paddingTop: 10 }}>
        <TooltipRow color={FEE_EQUITY} label="Equity" value={money(row.equity)} />
        <div style={chartTooltipDividerStyle} />
        <TooltipRow color={FEE_PAID} label="Cash Paid" value={money(row.paid)} />
        <TooltipRow color={FEE_UNPAID} label="Cash Unpaid" value={money(row.unpaid)} />
        <TooltipRow label="Cash total" value={money(row.cash)} />
      </div>
      <div style={chartTooltipDividerStyle} />
      <TooltipRow label="Service Fee Total" value={money(row.serviceFeeTotal)} strong />
      {showProjectDetails ? (
        <>
          <div style={{ ...chartTooltipDividerStyle, marginTop: 12 }} />
          <Button
            type="default"
            block
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onProjectDetails?.(row);
            }}
            style={{ borderRadius: 6, fontSize: 13 }}
          >
            Project Details
          </Button>
        </>
      ) : null}
    </div>
  );
}
function TooltipRow({
  color,
  label,
  value,
  valueTone,
  strong,
}: {
  color?: string;
  label: string;
  value: string;
  valueTone?: 'danger';
  strong?: boolean;
}) {
  const valueColor = valueTone === 'danger' ? '#cf1322' : '#1f1f1f';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#595959', minWidth: 0 }}>
        {color ? (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }}
          />
        ) : null}
        <span style={{ fontWeight: strong ? 600 : 400, color: strong ? '#262626' : '#595959' }}>{label}</span>
      </span>
      <span style={{ fontWeight: strong ? 700 : 600, color: valueColor, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

type ClientCollectionChartCardProps = {
  filterScopeKey: string;
  periodCount: number;
  selectedSalesKeys: CollectionChartSalesFilter;
  selectedClientIds: CollectionChartClientFilter;
};

export function ClientCollectionChartCard({
  filterScopeKey,
  periodCount,
  selectedSalesKeys,
  selectedClientIds,
}: ClientCollectionChartCardProps) {
  const [clickedDrillKey, setClickedDrillKey] = useState<string | null>(null);

  useEffect(() => {
    setClickedDrillKey(null);
  }, [filterScopeKey]);

  const filterDrillKey = useMemo(() => {
    if (isAllClientsSelected(selectedClientIds) || selectedClientIds.length !== 1) return null;
    return collectionGroupForClient(selectedClientIds[0])?.key ?? null;
  }, [selectedClientIds]);

  const activeDrillKey = clickedDrillKey ?? filterDrillKey;
  const drillFromFilter = filterDrillKey != null && clickedDrillKey == null;

  const clientRows = useMemo(
    () => buildClientRows(periodCount, selectedSalesKeys, selectedClientIds),
    [periodCount, selectedClientIds, selectedSalesKeys, filterScopeKey],
  );

  const drillGroup = useMemo(
    () => COLLECTION_CLIENT_GROUPS.find((g) => g.key === activeDrillKey) ?? null,
    [activeDrillKey],
  );

  const projectRows = useMemo(
    () => (activeDrillKey ? buildProjectRows(activeDrillKey, periodCount) : []),
    [activeDrillKey, periodCount, filterScopeKey],
  );

  const chartRows = activeDrillKey ? projectRows : clientRows;
  const chartMax = useMemo(() => {
    const max = chartRows.reduce((m, row) => Math.max(m, row.serviceFeeTotal), 0);
    return Math.max(20_000, Math.ceil(max * 1.12));
  }, [chartRows]);

  const handleBarAreaClick = (row: CollectionBarRow) => {
    if (activeDrillKey) return;
    setClickedDrillKey(row.key);
  };

  if (chartRows.length === 0) {
    return (
      <Card
        bordered
        style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
        styles={{ body: { padding: '18px 18px 18px' } }}
      >
        <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
          Account Overview
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
          Service fee total by Equity and Cash (Invoice). Click a bar to view sub-projects.
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          No clients match the current sales and client filters in this view.
        </Text>
      </Card>
    );
  }

  return (
    <Card
      bordered
      style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
      styles={{ body: { padding: '18px 18px 18px' } }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {drillGroup && !drillFromFilter ? (
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              aria-label="Back to all clients"
              onClick={() => setClickedDrillKey(null)}
              style={{ borderRadius: 8, flexShrink: 0 }}
            />
          ) : null}
          <Title level={5} style={{ margin: 0 }}>
            {drillGroup ? `${drillGroup.label} · projects` : 'Account Overview'}
          </Title>
        </div>
        {!drillGroup ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
            Service fee total by Equity and Cash (Invoice). Click a bar to view sub-projects.
          </Text>
        ) : null}
      </div>

      <div className="account-overview-chart" style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            key={`${filterScopeKey}-${activeDrillKey ?? 'clients'}`}
            data={chartRows}
            margin={{ top: 8, right: 12, left: 0, bottom: activeDrillKey ? 4 : 8 }}
            barCategoryGap={activeDrillKey ? '12%' : '18%'}
            maxBarSize={60}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: activeDrillKey ? 11 : 12 }}
              axisLine={{ stroke: '#e8e8e8' }}
              interval={0}
              angle={activeDrillKey ? -28 : 0}
              textAnchor={activeDrillKey ? 'end' : 'middle'}
              height={activeDrillKey ? 72 : 30}
            />
            <YAxis
              tickFormatter={(v) => axisMoneyShort(Number(v))}
              domain={[0, chartMax]}
              tick={{ fontSize: 12 }}
              width={56}
              axisLine={{ stroke: '#e8e8e8' }}
            />
            <RTooltip
              content={(tooltipProps) => (
                <CollectionTooltip
                  {...tooltipProps}
                  canDrillToProjects={!activeDrillKey}
                  onProjectDetails={handleBarAreaClick}
                />
              )}
              cursor={{ fill: 'rgba(70, 155, 255, 0.06)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar
              dataKey="equity"
              name="Equity"
              stackId="fee"
              fill={FEE_EQUITY}
              cursor={activeDrillKey ? 'default' : 'pointer'}
              onClick={(entry) => {
                if (activeDrillKey || !entry?.payload) return;
                handleBarAreaClick(entry.payload as CollectionBarRow);
              }}
            />
            <Bar
              dataKey="paid"
              name="Cash Paid"
              stackId="fee"
              fill={FEE_PAID}
              cursor={activeDrillKey ? 'default' : 'pointer'}
              onClick={(entry) => {
                if (activeDrillKey || !entry?.payload) return;
                handleBarAreaClick(entry.payload as CollectionBarRow);
              }}
            />
            <Bar
              dataKey="unpaid"
              name="Cash Unpaid"
              stackId="fee"
              fill={FEE_UNPAID}
              radius={[4, 4, 0, 0]}
              cursor={activeDrillKey ? 'default' : 'pointer'}
              onClick={(entry) => {
                if (activeDrillKey || !entry?.payload) return;
                handleBarAreaClick(entry.payload as CollectionBarRow);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
