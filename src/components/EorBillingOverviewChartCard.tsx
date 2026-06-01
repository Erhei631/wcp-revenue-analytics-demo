import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CHART_PURPLE, THEME_PRIMARY } from '../constants/chartColors';
import type { DemoRepKey } from '../data/analyticsDemoSeries';
import {
  buildEorBillingClientChartRows,
  buildEorBillingProjectChartRows,
  eorBillingClientLabel,
  type EorBillingChartRow,
} from '../data/eorBillingDemo';
import { DEMO_CLIENT_IDS, type DemoClientId } from '../data/demoClientCatalog';
import { formatMoneyValue } from '../utils/moneyFormat';

const { Text, Title } = Typography;

const EOR_SERVICE_FEE = THEME_PRIMARY;
const EOR_COSTS = CHART_PURPLE;
const EOR_CREDIT = '#FFB800';

const SALES_REP_LABELS: Record<DemoRepKey, string> = {
  alice: 'Alice Chen',
  bob: 'Bob Li',
  carol: 'Carol Wang',
  david: 'David Park',
};

const CHART_HEIGHT = 360;
const CHART_Y_AXIS_WIDTH = 56;
const CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 8 };
const BAR_MIN_WIDTH = 24;
const BAR_MAX_WIDTH = 60;
const MIN_CATEGORY_GAP = 6;

function useChartContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function computeClientBarLayout(plotWidth: number, barCount: number) {
  if (barCount <= 0 || plotWidth <= 0) {
    return { barSize: BAR_MAX_WIDTH, categoryGap: 8, needsScroll: false, contentWidth: plotWidth };
  }

  const minContentWidth = barCount * BAR_MIN_WIDTH + Math.max(0, barCount - 1) * MIN_CATEGORY_GAP;

  if (plotWidth < minContentWidth) {
    const slot = minContentWidth / barCount;
    return {
      barSize: BAR_MIN_WIDTH,
      categoryGap: Math.max(MIN_CATEGORY_GAP, Math.round(slot - BAR_MIN_WIDTH)),
      needsScroll: true,
      contentWidth: minContentWidth,
    };
  }

  const slot = plotWidth / barCount;
  const barSize = Math.min(BAR_MAX_WIDTH, Math.max(BAR_MIN_WIDTH, Math.round(slot * 0.72)));
  const categoryGap = Math.max(MIN_CATEGORY_GAP, Math.round(slot - barSize));

  return { barSize, categoryGap, needsScroll: false, contentWidth: plotWidth };
}

function axisMoneyShort(n: number) {
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function isAllClientsSelected(clientIds: readonly DemoClientId[]) {
  return clientIds.length === 0 || clientIds.length === DEMO_CLIENT_IDS.length;
}

type EorBillingOverviewChartCardProps = {
  filterScopeKey: string;
  rangeStartIdx: number;
  rangeEndIdx: number;
  selectedClientIds: DemoClientId[];
  selectedSalesKeys: DemoRepKey[];
};

function EorBillingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: EorBillingChartRow }[];
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      className="collection-tooltip"
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '12px 14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        minWidth: 220,
      }}
    >
      <div className="collection-tooltip__header-block">
        <div className="collection-tooltip__header">{row.label}</div>
      </div>
      <div className="collection-tooltip__divider" />
      <div className="collection-tooltip__row">
        <span className="collection-tooltip__row-label">
          <span className="collection-tooltip__dot" style={{ background: EOR_SERVICE_FEE }} />
          Service Fee
        </span>
        <strong>{formatMoneyValue(row.serviceFeeRevenue)}</strong>
      </div>
      <div className="collection-tooltip__row">
        <span className="collection-tooltip__row-label">
          <span className="collection-tooltip__dot" style={{ background: EOR_COSTS }} />
          Costs
        </span>
        <strong>{formatMoneyValue(row.costs)}</strong>
      </div>
      <div className="collection-tooltip__row">
        <span className="collection-tooltip__row-label">
          <span className="collection-tooltip__dot" style={{ background: EOR_CREDIT }} />
          Credit
        </span>
        <strong>{formatMoneyValue(row.credit)}</strong>
      </div>
      <div className="collection-tooltip__divider" aria-hidden />
      <div className="collection-tooltip__row">
        <span>Total</span>
        <strong>{formatMoneyValue(row.total)}</strong>
      </div>
    </div>
  );
}

export function EorBillingOverviewChartCard({
  filterScopeKey,
  rangeStartIdx,
  rangeEndIdx,
  selectedClientIds,
  selectedSalesKeys,
}: EorBillingOverviewChartCardProps) {
  const [clickedDrillClientId, setClickedDrillClientId] = useState<DemoClientId | null>(null);

  const filterParams = useMemo(
    () => ({
      rangeStartIdx,
      rangeEndIdx,
      clientIds: selectedClientIds,
      salesKeys: selectedSalesKeys,
    }),
    [rangeEndIdx, rangeStartIdx, selectedClientIds, selectedSalesKeys],
  );

  useEffect(() => {
    setClickedDrillClientId(null);
  }, [filterScopeKey]);

  const filterDrillClientId = useMemo(() => {
    if (isAllClientsSelected(selectedClientIds) || selectedClientIds.length !== 1) return null;
    return selectedClientIds[0] ?? null;
  }, [selectedClientIds]);

  const activeDrillClientId = clickedDrillClientId ?? filterDrillClientId;
  const drillFromFilter = filterDrillClientId != null && clickedDrillClientId == null;

  const clientRows = useMemo(
    () => buildEorBillingClientChartRows(filterParams),
    [filterParams, filterScopeKey],
  );

  const projectRows = useMemo(
    () =>
      activeDrillClientId
        ? buildEorBillingProjectChartRows(activeDrillClientId, filterParams)
        : [],
    [activeDrillClientId, filterParams, filterScopeKey],
  );

  const chartRows = activeDrillClientId ? projectRows : clientRows;
  const drillClientLabel = activeDrillClientId
    ? eorBillingClientLabel(activeDrillClientId) ?? activeDrillClientId
    : null;
  const drillOwner = chartRows[0]?.owner;

  const chartMax = useMemo(() => {
    const max = chartRows.reduce((m, row) => Math.max(m, row.total), 0);
    return Math.max(20_000, Math.ceil(max * 1.12));
  }, [chartRows]);

  const { ref: chartContainerRef, width: chartContainerWidth } = useChartContainerWidth();
  const plotWidth = Math.max(0, chartContainerWidth - CHART_Y_AXIS_WIDTH - CHART_MARGIN.right);
  const barLayout = useMemo(
    () => computeClientBarLayout(plotWidth, chartRows.length),
    [chartRows.length, plotWidth],
  );
  const chartInnerWidth = barLayout.needsScroll
    ? barLayout.contentWidth + CHART_Y_AXIS_WIDTH + CHART_MARGIN.right
    : undefined;

  const handleBarClick = useCallback(
    (row: EorBillingChartRow) => {
      if (activeDrillClientId) return;
      setClickedDrillClientId(row.key as DemoClientId);
    },
    [activeDrillClientId],
  );

  if (chartRows.length === 0) {
    return (
      <Card
        className="account-overview-card"
        bordered
        style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
        styles={{ body: { padding: '18px 18px 18px' } }}
      >
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
          Account Overview
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          No EOR clients match the current filters in this view.
        </Text>
      </Card>
    );
  }

  const isProjectView = Boolean(activeDrillClientId);

  return (
    <Card
      className="account-overview-card"
      bordered
      style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
      styles={{ body: { padding: '18px 18px 18px' } }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {activeDrillClientId && !drillFromFilter ? (
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              aria-label="Back to all clients"
              onClick={() => setClickedDrillClientId(null)}
              style={{ borderRadius: 8, flexShrink: 0 }}
            />
          ) : null}
          <Title level={5} style={{ margin: 0 }}>
            {drillClientLabel ? (
              <span className="account-overview-chart__title-row">
                <span>{drillClientLabel}</span>
                {drillOwner ? (
                  <>
                    <span className="account-overview-chart__title-divider" aria-hidden />
                    <span className="account-overview-chart__title-sales">
                      Sales: {SALES_REP_LABELS[drillOwner]}
                    </span>
                  </>
                ) : null}
              </span>
            ) : (
              'Account Overview'
            )}
          </Title>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className={
          barLayout.needsScroll
            ? 'account-overview-chart account-overview-chart--scrollable'
            : 'account-overview-chart'
        }
        style={{ height: CHART_HEIGHT }}
      >
        <div
          className="account-overview-chart__inner"
          style={{
            width: chartInnerWidth ?? '100%',
            minWidth: '100%',
            height: CHART_HEIGHT,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={`${filterScopeKey}-${activeDrillClientId ?? 'clients'}`}
              data={chartRows}
              margin={CHART_MARGIN}
              barCategoryGap={barLayout.categoryGap}
              maxBarSize={BAR_MAX_WIDTH}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: '#e8e8e8' }}
                interval={0}
                angle={isProjectView ? -28 : -35}
                textAnchor="end"
                height={isProjectView ? 72 : 88}
              />
              <YAxis
                tickFormatter={(v) => axisMoneyShort(Number(v))}
                domain={[0, chartMax]}
                tick={{ fontSize: 12 }}
                width={CHART_Y_AXIS_WIDTH}
                axisLine={{ stroke: '#e8e8e8' }}
              />
              <RTooltip content={<EorBillingTooltip />} cursor={{ fill: 'rgba(70, 155, 255, 0.06)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar
                dataKey="serviceFeeRevenue"
                name="Service Fee"
                fill={EOR_SERVICE_FEE}
                stackId="eor"
                barSize={barLayout.barSize}
                cursor={isProjectView ? 'default' : 'pointer'}
                onClick={(entry) => {
                  if (!isProjectView && entry?.payload) {
                    handleBarClick(entry.payload as EorBillingChartRow);
                  }
                }}
              />
              <Bar
                dataKey="costs"
                name="Costs"
                fill={EOR_COSTS}
                stackId="eor"
                barSize={barLayout.barSize}
                cursor={isProjectView ? 'default' : 'pointer'}
                onClick={(entry) => {
                  if (!isProjectView && entry?.payload) {
                    handleBarClick(entry.payload as EorBillingChartRow);
                  }
                }}
              />
              <Bar
                dataKey="credit"
                name="Credit"
                fill={EOR_CREDIT}
                stackId="eor"
                radius={[4, 4, 0, 0]}
                barSize={barLayout.barSize}
                cursor={isProjectView ? 'default' : 'pointer'}
                onClick={(entry) => {
                  if (!isProjectView && entry?.payload) {
                    handleBarClick(entry.payload as EorBillingChartRow);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
