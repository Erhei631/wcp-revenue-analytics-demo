import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Button, Card, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type BarRectangleItem,
} from 'recharts';
import { CHART_PURPLE, THEME_PRIMARY } from '../constants/chartColors';
import {
  COLLECTION_CLIENT_GROUPS,
  type CollectionClientGroup,
  type CollectionProjectDef,
} from '../data/collectionClientDemo';
import { DEMO_CLIENT_IDS, type DemoClientId } from '../data/demoClientCatalog';
import type { DemoRepKey } from '../data/analyticsDemoSeries';
import { eorRevenueFraction, isClientInEorScope, projectsForRevenueScope } from '../data/eorProjectDemo';

const { Text, Title } = Typography;

const FEE_EQUITY = '#57CEF4';
const FEE_PAID = THEME_PRIMARY;
const FEE_UNPAID = '#FFB800';

const SALES_REP_LABELS: Record<DemoRepKey, string> = {
  alice: 'Alice Chen',
  bob: 'Bob Li',
  carol: 'Carol Wang',
  david: 'David Park',
};
const DEMO_PERIOD_COUNT = 5;
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

export type CollectionChartClientFilter = DemoClientId[];

export type CollectionChartSalesFilter = DemoRepKey[];

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
  /** Service Fee Total = Equity + Cash; for EOR, equals revenue with no fee split. */
  serviceFeeTotal: number;
  /** EOR projects: single revenue amount, no Equity / Cash composition. */
  revenueOnly?: boolean;
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

function toRevenueBarRow(key: string, label: string, revenue: number): CollectionBarRow {
  const total = Math.max(0, Math.round(revenue));
  return {
    key,
    label,
    equity: 0,
    paid: 0,
    unpaid: 0,
    cash: 0,
    serviceFeeTotal: total,
    revenueOnly: true,
  };
}

function groupServiceFeeTotal(group: CollectionClientGroup) {
  return group.equity + group.paid + group.unpaid;
}

function splitRevenueByWeights(
  totalRevenue: number,
  projects: CollectionProjectDef[],
): CollectionBarRow[] {
  const totalWeight = projects.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return [];
  let remaining = totalRevenue;
  return projects.map((project, index) => {
    const isLast = index === projects.length - 1;
    const share = isLast ? remaining : Math.round((totalRevenue * project.weight) / totalWeight);
    remaining -= share;
    return toRevenueBarRow(project.key, project.name, share);
  });
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
  return clientIds.includes(group.filterClientId);
}

function collectionGroupForClient(clientId: DemoClientId) {
  return COLLECTION_CLIENT_GROUPS.find((g) => g.filterClientId === clientId) ?? null;
}

function buildClientRows(
  periodCount: number,
  salesKeys: CollectionChartSalesFilter,
  clientIds: CollectionChartClientFilter,
  eorOnly: boolean,
): CollectionBarRow[] {
  const salesSet = new Set(salesKeys);
  const allSales = isAllSalesSelected(salesKeys);

  return COLLECTION_CLIENT_GROUPS.filter(
    (g) =>
      (allSales || salesSet.has(g.owner)) &&
      matchesClientFilter(g, clientIds) &&
      (!eorOnly || isClientInEorScope(g.filterClientId)),
  )
    .map((group) => {
      const scale = eorOnly ? eorRevenueFraction(group.projects) : 1;
      if (eorOnly) {
        const revenue = Math.round(scaleForPeriod(groupServiceFeeTotal(group), periodCount) * scale);
        return toRevenueBarRow(group.key, group.label, revenue);
      }
      const equity = Math.round(scaleForPeriod(group.equity, periodCount) * scale);
      const paid = Math.round(scaleForPeriod(group.paid, periodCount) * scale);
      const unpaid = Math.round(scaleForPeriod(group.unpaid, periodCount) * scale);
      return toBarRow(group.key, group.label, equity, paid, unpaid);
    })
    .filter((row) => row.serviceFeeTotal > 0)
    .sort((a, b) => b.serviceFeeTotal - a.serviceFeeTotal);
}

function collectionGroupForRow(row: CollectionBarRow) {
  return (
    COLLECTION_CLIENT_GROUPS.find((g) => g.key === row.key) ??
    COLLECTION_CLIENT_GROUPS.find((g) => g.projects.some((p) => p.key === row.key)) ??
    null
  );
}

function salesLabelForRow(row: CollectionBarRow) {
  const group = collectionGroupForRow(row);
  if (!group) return null;
  return SALES_REP_LABELS[group.owner] ?? null;
}

function isProjectRow(row: CollectionBarRow) {
  return COLLECTION_CLIENT_GROUPS.some((g) => g.projects.some((p) => p.key === row.key));
}

function buildProjectRows(
  clientKey: string,
  periodCount: number,
  eorOnly: boolean,
): CollectionBarRow[] {
  const group = COLLECTION_CLIENT_GROUPS.find((g) => g.key === clientKey);
  if (!group) return [];

  const projects = projectsForRevenueScope(group.projects, eorOnly);
  if (projects.length === 0) return [];

  const amountScale = eorOnly ? eorRevenueFraction(group.projects) : 1;
  if (eorOnly) {
    const revenue = Math.round(scaleForPeriod(groupServiceFeeTotal(group), periodCount) * amountScale);
    return splitRevenueByWeights(revenue, projects);
  }
  const equity = Math.round(scaleForPeriod(group.equity, periodCount) * amountScale);
  const paid = Math.round(scaleForPeriod(group.paid, periodCount) * amountScale);
  const unpaid = Math.round(scaleForPeriod(group.unpaid, periodCount) * amountScale);
  return splitByWeights(equity, paid, unpaid, projects);
}

const chartTooltipShellStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '12px 14px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  minWidth: 220,
  pointerEvents: 'auto',
};

function CollectionTooltip({
  row,
  canDrillToProjects,
  onProjectDetails,
  onMouseEnter,
  onMouseLeave,
}: {
  row: CollectionBarRow;
  canDrillToProjects?: boolean;
  onProjectDetails?: (row: CollectionBarRow) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const isClientBar = COLLECTION_CLIENT_GROUPS.some((g) => g.key === row.key);
  const isProjectBar = isProjectRow(row);
  const showProjectDetails = Boolean(canDrillToProjects && isClientBar && onProjectDetails);
  const salesLabel = salesLabelForRow(row);

  return (
    <div
      style={chartTooltipShellStyle}
      className="collection-tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="collection-tooltip__header-block">
        <div className="collection-tooltip__header">{row.label}</div>
        {salesLabel && !isProjectBar ? (
          <div className="collection-tooltip__sales">Sales: {salesLabel}</div>
        ) : null}
      </div>
      <div className="collection-tooltip__divider" />
      {row.revenueOnly ? (
        <TooltipRow color={CHART_PURPLE} label="Revenue" value={money(row.serviceFeeTotal)} strong />
      ) : (
        <>
          <TooltipRow label="Service Fee" value={money(row.serviceFeeTotal)} strong />
          <div className="collection-tooltip__divider" />
          <div className="collection-tooltip__body">
            <TooltipRow color={FEE_EQUITY} label="Equity" value={money(row.equity)} valueBold />
            {isProjectBar ? (
              <TooltipRow color={FEE_PAID} label="Cash" value={money(row.cash)} valueBold />
            ) : (
              <div className="collection-tooltip-cash">
                <TooltipRow label="Cash" value={money(row.cash)} valueBold />
                <div className="collection-tooltip-cash__tree">
                  <TooltipRow color={FEE_PAID} label="Paid" value={money(row.paid)} nested />
                  <TooltipRow color={FEE_UNPAID} label="Unpaid" value={money(row.unpaid)} nested />
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {showProjectDetails ? (
        <>
          <div className="collection-tooltip__divider" />
          <Button
            type="default"
            block
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onProjectDetails?.(row);
            }}
            className="collection-tooltip__action"
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
  strong,
  valueBold,
  nested,
}: {
  color?: string;
  label: string;
  value: string;
  strong?: boolean;
  valueBold?: boolean;
  nested?: boolean;
}) {
  const labelWeight = strong ? 600 : 400;
  const labelColor = strong ? '#262626' : '#595959';
  const valueWeight = strong ? 700 : valueBold ? 600 : nested ? 400 : 600;
  const valueColor = nested ? '#595959' : '#262626';

  return (
    <div className="collection-tooltip__row">
      <span className="collection-tooltip__row-label">
        {color ? <span className="collection-tooltip__dot" style={{ background: color }} /> : null}
        <span style={{ fontWeight: labelWeight, color: labelColor }}>{label}</span>
      </span>
      <span style={{ fontWeight: valueWeight, color: valueColor, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function renderAccountOverviewBars({
  activeDrillKey,
  chartMax,
  revenueOnly,
  onBarClick,
  barSize,
  onBarMouseEnter,
  onBarMouseLeave,
}: {
  activeDrillKey: string | null;
  chartMax: number;
  revenueOnly: boolean;
  onBarClick: (row: CollectionBarRow) => void;
  barSize: number;
  onBarMouseEnter: (data: BarRectangleItem, event: ReactMouseEvent<SVGPathElement>) => void;
  onBarMouseLeave: (event: ReactMouseEvent<SVGPathElement>) => void;
}) {
  const isProjectView = Boolean(activeDrillKey);
  const barPointerProps = {
    barSize,
    stackId: revenueOnly ? ('revenue' as const) : ('fee' as const),
    cursor: isProjectView ? ('default' as const) : ('pointer' as const),
    onMouseEnter: (data: BarRectangleItem, _index: number, event: ReactMouseEvent<SVGPathElement>) =>
      onBarMouseEnter(data, event),
    onMouseLeave: (_data: BarRectangleItem, _index: number, event: ReactMouseEvent<SVGPathElement>) =>
      onBarMouseLeave(event),
    onClick: (entry: BarRectangleItem) => {
      if (isProjectView || !entry?.payload) return;
      onBarClick(entry.payload as CollectionBarRow);
    },
  };

  return (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: activeDrillKey ? 11 : 11 }}
        axisLine={{ stroke: '#e8e8e8' }}
        interval={0}
        angle={activeDrillKey ? -28 : -35}
        textAnchor="end"
        height={activeDrillKey ? 72 : 88}
      />
      <YAxis
        tickFormatter={(v) => axisMoneyShort(Number(v))}
        domain={[0, chartMax]}
        tick={{ fontSize: 12 }}
        width={56}
        axisLine={{ stroke: '#e8e8e8' }}
      />
      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
      {revenueOnly ? (
        <Bar
          dataKey="serviceFeeTotal"
          name="Revenue"
          fill={CHART_PURPLE}
          radius={[4, 4, 0, 0]}
          {...barPointerProps}
        />
      ) : isProjectView ? (
        <>
          <Bar dataKey="cash" name="Cash" fill={FEE_PAID} {...barPointerProps} />
          <Bar dataKey="equity" name="Equity" fill={FEE_EQUITY} radius={[4, 4, 0, 0]} {...barPointerProps} />
        </>
      ) : (
        <>
          <Bar dataKey="equity" name="Equity" fill={FEE_EQUITY} {...barPointerProps} />
          <Bar dataKey="paid" name="Cash Paid" fill={FEE_PAID} {...barPointerProps} />
          <Bar dataKey="unpaid" name="Cash Unpaid" fill={FEE_UNPAID} radius={[4, 4, 0, 0]} {...barPointerProps} />
        </>
      )}
    </>
  );
}

type ClientCollectionChartCardProps = {
  filterScopeKey: string;
  periodCount: number;
  selectedSalesKeys: CollectionChartSalesFilter;
  selectedClientIds: CollectionChartClientFilter;
  eorOnly?: boolean;
  /** Deep-link: open project drill-down for this client group key (e.g. `acme`). */
  initialDrillKey?: string | null;
};

export function ClientCollectionChartCard({
  filterScopeKey,
  periodCount,
  selectedSalesKeys,
  selectedClientIds,
  eorOnly = false,
  initialDrillKey = null,
}: ClientCollectionChartCardProps) {
  const [clickedDrillKey, setClickedDrillKey] = useState<string | null>(initialDrillKey);
  const [tooltipRow, setTooltipRow] = useState<CollectionBarRow | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);
  const [tooltipPinned, setTooltipPinned] = useState(false);
  const chartInnerRef = useRef<HTMLDivElement>(null);
  const captureRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClickedDrillKey(initialDrillKey ?? null);
    setTooltipRow(null);
    setTooltipAnchor(null);
    setTooltipPinned(false);
  }, [filterScopeKey, initialDrillKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('drill') && !params.get('figmacapture')) return;
    const timer = window.setTimeout(() => {
      captureRootRef.current?.scrollIntoView({ block: 'center' });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [filterScopeKey, initialDrillKey]);

  const filterDrillKey = useMemo(() => {
    if (isAllClientsSelected(selectedClientIds) || selectedClientIds.length !== 1) return null;
    return collectionGroupForClient(selectedClientIds[0])?.key ?? null;
  }, [selectedClientIds]);

  const activeDrillKey = clickedDrillKey ?? filterDrillKey;
  const drillFromFilter = filterDrillKey != null && clickedDrillKey == null;

  const clientRows = useMemo(
    () => buildClientRows(periodCount, selectedSalesKeys, selectedClientIds, eorOnly),
    [eorOnly, periodCount, selectedClientIds, selectedSalesKeys, filterScopeKey],
  );

  const drillGroup = useMemo(
    () => COLLECTION_CLIENT_GROUPS.find((g) => g.key === activeDrillKey) ?? null,
    [activeDrillKey],
  );

  const projectRows = useMemo(
    () => (activeDrillKey ? buildProjectRows(activeDrillKey, periodCount, eorOnly) : []),
    [activeDrillKey, eorOnly, periodCount, filterScopeKey],
  );

  const chartRows = activeDrillKey ? projectRows : clientRows;
  const chartMax = useMemo(() => {
    const max = chartRows.reduce((m, row) => Math.max(m, row.serviceFeeTotal), 0);
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

  const handleBarAreaClick = (row: CollectionBarRow) => {
    if (activeDrillKey) return;
    setClickedDrillKey(row.key);
  };

  const clearTooltip = useCallback(() => {
    setTooltipRow(null);
    setTooltipAnchor(null);
    setTooltipPinned(false);
  }, []);

  const handleBarClick = useCallback(
    (row: CollectionBarRow) => {
      clearTooltip();
      handleBarAreaClick(row);
    },
    [activeDrillKey, clearTooltip],
  );

  const isTooltipTarget = useCallback((node: EventTarget | null) => {
    if (!(node instanceof Node)) return false;
    return Boolean(
      chartInnerRef.current?.contains(node) &&
        (node instanceof Element ? node.closest('.account-overview-chart__tooltip-floating') : false),
    );
  }, []);

  const handleBarMouseEnter = useCallback((data: BarRectangleItem) => {
    const row = data.payload as CollectionBarRow | undefined;
    if (!row) return;

    setTooltipRow(row);
    setTooltipAnchor({
      x: data.tooltipPosition.x,
      y: data.tooltipPosition.y,
    });
  }, []);

  const handleBarMouseLeave = useCallback(
    (event: ReactMouseEvent<SVGPathElement>) => {
      if (tooltipPinned) return;
      if (isTooltipTarget(event.relatedTarget)) return;
      clearTooltip();
    },
    [clearTooltip, isTooltipTarget, tooltipPinned],
  );

  const handleChartInnerMouseLeave = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (tooltipPinned) return;
      if (isTooltipTarget(event.relatedTarget)) return;
      clearTooltip();
    },
    [clearTooltip, isTooltipTarget, tooltipPinned],
  );

  if (chartRows.length === 0) {
    return (
      <Card
        id="account-overview-capture"
        className="account-overview-card"
        bordered
        style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
        styles={{ body: { padding: '18px 18px 18px' } }}
      >
        <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
          Account Overview
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
          {eorOnly
            ? 'EOR project revenue only (no Equity / Cash split). Click a bar to view EOR sub-projects.'
            : 'Service fee total by Equity and Cash (Invoice). Click a bar to view sub-projects.'}
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          No clients match the current sales and client filters in this view.
        </Text>
      </Card>
    );
  }

  return (
    <div ref={captureRootRef} id="account-overview-capture" className="account-overview-capture-root">
    <Card
      className="account-overview-card"
      bordered
      style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
      styles={{ body: { padding: '18px 18px 18px' } }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            {drillGroup ? (
              <span className="account-overview-chart__title-row">
                <span>{drillGroup.label}</span>
                <span className="account-overview-chart__title-divider" aria-hidden />
                <span className="account-overview-chart__title-sales">Sales: {SALES_REP_LABELS[drillGroup.owner]}</span>
              </span>
            ) : (
              'Account Overview'
            )}
          </Title>
        </div>
        {!drillGroup ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
            {eorOnly
              ? 'EOR project revenue only (no Equity / Cash split). Click a bar to view EOR sub-projects.'
              : 'Service fee total by Equity and Cash (Invoice). Click a bar to view sub-projects.'}
          </Text>
        ) : null}
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
          ref={chartInnerRef}
          className={
            tooltipPinned
              ? 'account-overview-chart__inner account-overview-chart__inner--tooltip-open'
              : 'account-overview-chart__inner'
          }
          style={{
            width: chartInnerWidth ?? '100%',
            minWidth: '100%',
            height: CHART_HEIGHT,
          }}
          onMouseLeave={handleChartInnerMouseLeave}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={`${filterScopeKey}-${activeDrillKey ?? 'clients'}`}
              data={chartRows}
              margin={CHART_MARGIN}
              barCategoryGap={barLayout.categoryGap}
              maxBarSize={BAR_MAX_WIDTH}
            >
              {renderAccountOverviewBars({
                activeDrillKey,
                chartMax,
                revenueOnly: eorOnly,
                onBarClick: handleBarClick,
                barSize: barLayout.barSize,
                onBarMouseEnter: handleBarMouseEnter,
                onBarMouseLeave: handleBarMouseLeave,
              })}
            </BarChart>
          </ResponsiveContainer>
          {tooltipRow && tooltipAnchor ? (
            <div
              className="account-overview-chart__tooltip-floating"
              style={{ left: tooltipAnchor.x, top: tooltipAnchor.y }}
              onMouseEnter={() => setTooltipPinned(true)}
              onMouseLeave={() => clearTooltip()}
            >
              <CollectionTooltip
                row={tooltipRow}
                canDrillToProjects={!activeDrillKey}
                onProjectDetails={(row) => {
                  clearTooltip();
                  handleBarAreaClick(row);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
    </div>
  );
}
