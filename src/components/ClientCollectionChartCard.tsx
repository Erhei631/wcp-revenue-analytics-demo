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
import { CHART_GREEN, THEME_PRIMARY } from '../constants/chartColors';

const { Text, Title } = Typography;

const COLLECTION_PAID = CHART_GREEN;
const COLLECTION_UNPAID = '#FFB800';
const DEMO_PERIOD_COUNT = 5;

type RepKey = 'alice' | 'bob' | 'carol' | 'david';

type CollectionProjectDef = {
  key: string;
  name: string;
  weight: number;
};

type CollectionClientGroup = {
  key: string;
  label: string;
  owner: RepKey;
  paid: number;
  unpaid: number;
  projects: CollectionProjectDef[];
};

const COLLECTION_CLIENT_GROUPS: CollectionClientGroup[] = [
  {
    key: 'apex',
    label: 'Client Apex',
    owner: 'alice',
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
export type CollectionChartClientFilter = string[];

type CollectionBarRow = {
  key: string;
  label: string;
  paid: number;
  unpaid: number;
  invoiced: number;
};

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

function splitByWeights(totalPaid: number, totalUnpaid: number, projects: CollectionProjectDef[]) {
  const totalWeight = projects.reduce((s, p) => s + p.weight, 0);
  let paidLeft = totalPaid;
  let unpaidLeft = totalUnpaid;

  return projects.map((project, index) => {
    const isLast = index === projects.length - 1;
    const paid = isLast ? paidLeft : Math.round((totalPaid * project.weight) / totalWeight);
    const unpaid = isLast ? unpaidLeft : Math.round((totalUnpaid * project.weight) / totalWeight);
    paidLeft -= paid;
    unpaidLeft -= unpaid;
    const invoiced = paid + unpaid;
    return {
      key: project.key,
      label: project.name,
      paid,
      unpaid,
      invoiced,
    };
  });
}

function isAllSalesSelected(salesKeys: CollectionChartSalesFilter) {
  return salesKeys.length === 0 || salesKeys.length === 4;
}

function buildClientRows(
  periodCount: number,
  salesKeys: CollectionChartSalesFilter,
): CollectionBarRow[] {
  const salesSet = new Set(salesKeys);
  const allSales = isAllSalesSelected(salesKeys);

  return COLLECTION_CLIENT_GROUPS.filter((g) => allSales || salesSet.has(g.owner))
    .map((group) => {
      const paid = scaleForPeriod(group.paid, periodCount);
      const unpaid = scaleForPeriod(group.unpaid, periodCount);
      return {
        key: group.key,
        label: group.label,
        paid,
        unpaid,
        invoiced: paid + unpaid,
      };
    })
    .filter((row) => row.invoiced > 0);
}

function buildProjectRows(clientKey: string, periodCount: number): CollectionBarRow[] {
  const group = COLLECTION_CLIENT_GROUPS.find((g) => g.key === clientKey);
  if (!group) return [];

  const paid = scaleForPeriod(group.paid, periodCount);
  const unpaid = scaleForPeriod(group.unpaid, periodCount);
  return splitByWeights(paid, unpaid, group.projects);
}

function collectionRate(paid: number, invoiced: number) {
  if (invoiced <= 0) return 0;
  return Math.round((paid / invoiced) * 100);
}

const chartTooltipShellStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '12px 14px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  minWidth: 188,
};

function CollectionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CollectionBarRow }>;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const rate = collectionRate(row.paid, row.invoiced);

  return (
    <div style={chartTooltipShellStyle}>
      <div style={{ fontWeight: 600, color: '#262626', marginBottom: 10, fontSize: 13 }}>{row.label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
        <TooltipRow color={THEME_PRIMARY} label="Invoiced" value={money(row.invoiced)} />
        <TooltipRow color={COLLECTION_PAID} label="Paid" value={money(row.paid)} />
        <TooltipRow color={COLLECTION_UNPAID} label="Unpaid" value={money(row.unpaid)} valueTone="danger" />
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#8c8c8c' }}>Collection rate: {rate}%</div>
    </div>
  );
}

function TooltipRow({
  color,
  label,
  value,
  valueTone,
}: {
  color: string;
  label: string;
  value: string;
  valueTone?: 'danger';
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
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
        {label}
      </span>
      <span style={{ fontWeight: 600, color: valueTone === 'danger' ? '#cf1322' : '#1f1f1f' }}>{value}</span>
    </div>
  );
}

type ClientCollectionChartCardProps = {
  filterScopeKey: string;
  periodCount: number;
  selectedSalesKeys: CollectionChartSalesFilter;
};

export function ClientCollectionChartCard({
  filterScopeKey,
  periodCount,
  selectedSalesKeys,
}: ClientCollectionChartCardProps) {
  const [drillClientKey, setDrillClientKey] = useState<string | null>(null);

  useEffect(() => {
    setDrillClientKey(null);
  }, [filterScopeKey]);

  const clientRows = useMemo(
    () => buildClientRows(periodCount, selectedSalesKeys),
    [periodCount, selectedSalesKeys, filterScopeKey],
  );

  const drillGroup = useMemo(
    () => COLLECTION_CLIENT_GROUPS.find((g) => g.key === drillClientKey) ?? null,
    [drillClientKey],
  );

  const projectRows = useMemo(
    () => (drillClientKey ? buildProjectRows(drillClientKey, periodCount) : []),
    [drillClientKey, periodCount, filterScopeKey],
  );

  const chartRows = drillClientKey ? projectRows : clientRows;
  const chartMax = useMemo(() => {
    const max = chartRows.reduce((m, row) => Math.max(m, row.invoiced), 0);
    return Math.max(20_000, Math.ceil(max * 1.12));
  }, [chartRows]);

  const handleBarAreaClick = (row: CollectionBarRow) => {
    if (drillClientKey) return;
    setDrillClientKey(row.key);
  };

  if (chartRows.length === 0) {
    return (
      <Card
        bordered
        style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
        styles={{ body: { padding: '18px 18px 18px' } }}
      >
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
          Client collection
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          No clients match the current sales filter in this view.
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
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
            {drillGroup ? `${drillGroup.label} · projects` : 'Client collection'}
          </Title>
        </div>
        {drillGroup ? (
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => setDrillClientKey(null)}
            style={{ borderRadius: 8, flexShrink: 0 }}
          >
            Back to all clients
          </Button>
        ) : null}
      </div>

      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            key={`${filterScopeKey}-${drillClientKey ?? 'clients'}`}
            data={chartRows}
            margin={{ top: 8, right: 12, left: 0, bottom: drillClientKey ? 4 : 8 }}
            barCategoryGap={drillClientKey ? '12%' : '18%'}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: drillClientKey ? 11 : 12 }}
              axisLine={{ stroke: '#e8e8e8' }}
              interval={0}
              angle={drillClientKey ? -28 : 0}
              textAnchor={drillClientKey ? 'end' : 'middle'}
              height={drillClientKey ? 72 : 30}
            />
            <YAxis
              tickFormatter={(v) => axisMoneyShort(Number(v))}
              domain={[0, chartMax]}
              tick={{ fontSize: 12 }}
              width={56}
              axisLine={{ stroke: '#e8e8e8' }}
            />
            <RTooltip content={<CollectionTooltip />} cursor={{ fill: 'rgba(70, 155, 255, 0.06)' }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar
              dataKey="paid"
              name="Paid"
              stackId="collection"
              fill={COLLECTION_PAID}
              radius={[0, 0, 0, 0]}
              cursor={drillClientKey ? 'default' : 'pointer'}
              onClick={(entry) => {
                if (drillClientKey || !entry?.payload) return;
                handleBarAreaClick(entry.payload as CollectionBarRow);
              }}
            />
            <Bar
              dataKey="unpaid"
              name="Unpaid balance"
              stackId="collection"
              fill={COLLECTION_UNPAID}
              radius={[4, 4, 0, 0]}
              cursor={drillClientKey ? 'default' : 'pointer'}
              onClick={(entry) => {
                if (drillClientKey || !entry?.payload) return;
                handleBarAreaClick(entry.payload as CollectionBarRow);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
