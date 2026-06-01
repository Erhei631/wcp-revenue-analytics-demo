import { useMemo } from 'react';
import { Card, Typography } from 'antd';
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
import { CHART_PURPLE, THEME_PRIMARY } from '../constants/chartColors';
import type { DemoRepKey } from '../data/analyticsDemoSeries';
import { buildEorBillingTrendData } from '../data/eorBillingDemo';
import type { DemoClientId } from '../data/demoClientCatalog';
import { formatMoneyValue } from '../utils/moneyFormat';

const { Title } = Typography;

const EOR_SERVICE_FEE = THEME_PRIMARY;
const EOR_COSTS = CHART_PURPLE;
const EOR_CREDIT = '#FFB800';

function axisMoneyShort(n: number) {
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function yAxisMaxFromDataMax(dataMax: number) {
  if (dataMax <= 0) return 100;
  return Math.ceil(dataMax * 1.08);
}

type EorBillingTrendChartCardProps = {
  filterScopeKey: string;
  rangeStartIdx: number;
  rangeEndIdx: number;
  selectedClientIds: DemoClientId[];
  selectedSalesKeys: DemoRepKey[];
};

function EorBillingTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number; color?: string; name?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="collection-tooltip"
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '12px 14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        minWidth: 200,
      }}
    >
      <div className="collection-tooltip__header-block">
        <div className="collection-tooltip__header">{label}</div>
      </div>
      <div className="collection-tooltip__divider" />
      {payload.map((entry) => (
        <div key={entry.dataKey} className="collection-tooltip__row">
          <span className="collection-tooltip__row-label">
            <span className="collection-tooltip__dot" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <strong>{formatMoneyValue(Number(entry.value))}</strong>
        </div>
      ))}
    </div>
  );
}

export function EorBillingTrendChartCard({
  filterScopeKey,
  rangeStartIdx,
  rangeEndIdx,
  selectedClientIds,
  selectedSalesKeys,
}: EorBillingTrendChartCardProps) {
  const filterParams = useMemo(
    () => ({
      rangeStartIdx,
      rangeEndIdx,
      clientIds: selectedClientIds,
      salesKeys: selectedSalesKeys,
    }),
    [rangeEndIdx, rangeStartIdx, selectedClientIds, selectedSalesKeys],
  );

  const trendData = useMemo(
    () => buildEorBillingTrendData(filterParams),
    [filterParams, filterScopeKey],
  );

  const chartMax = useMemo(() => {
    let max = 0;
    for (const row of trendData) {
      max = Math.max(max, row.serviceFeeRevenue, row.costs, row.credit);
    }
    return max;
  }, [trendData]);

  return (
    <Card
      bordered
      style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
      styles={{ body: { padding: '18px 18px 8px' } }}
    >
      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        EOR Billing Items Trend
      </Title>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer key={`eor-trend-${filterScopeKey}`}>
          <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e8e8e8' }} />
            <YAxis
              tickFormatter={(v) => axisMoneyShort(Number(v))}
              domain={[0, yAxisMaxFromDataMax(chartMax)]}
              tick={{ fontSize: 12 }}
              width={56}
              axisLine={{ stroke: '#e8e8e8' }}
            />
            <RTooltip content={<EorBillingTrendTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="serviceFeeRevenue"
              name="Service Fee"
              stroke={EOR_SERVICE_FEE}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: EOR_SERVICE_FEE }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="costs"
              name="Costs"
              stroke={EOR_COSTS}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: EOR_COSTS }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="credit"
              name="Credit"
              stroke={EOR_CREDIT}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: EOR_CREDIT }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
