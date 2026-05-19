import { useEffect, useState } from 'react';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_RED, THEME_PRIMARY } from '../constants/chartColors';
import { formatTotalShort } from '../data/demoClientCatalog';

const { Text } = Typography;

export type ClientRankRow = {
  key: string;
  rank: number;
  name: string;
  color: string;
  total: number;
  series: number[];
  rangeChangePct: number;
};

const TREND_CHART_UP = THEME_PRIMARY;
const TREND_CHART_DOWN = CHART_RED;

function isTrendUp(series: number[], rangeChangePct: number) {
  if (series.length >= 2) {
    const first = series[0] ?? 0;
    const last = series[series.length - 1] ?? 0;
    if (last !== first) return last > first;
  }
  return rangeChangePct >= 0;
}

function trendChartColor(trendUp: boolean) {
  return trendUp ? TREND_CHART_UP : TREND_CHART_DOWN;
}

type RevenueByClientRankListProps = {
  rows: ClientRankRow[];
  periods: string[];
  filterScopeKey?: string;
  emptyMessage?: string;
};

function money(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}

function axisMoneyShort(n: number) {
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function RevenueByClientRankList({
  rows,
  periods,
  filterScopeKey,
  emptyMessage = 'No clients match the current filters in this view.',
}: RevenueByClientRankListProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(() => rows[0]?.key ?? null);

  useEffect(() => {
    setExpandedKey(rows[0]?.key ?? null);
  }, [filterScopeKey, rows]);

  if (rows.length === 0) {
    return (
      <div className="revenue-by-client-rank revenue-by-client-rank--empty">
        <Text type="secondary">{emptyMessage}</Text>
      </div>
    );
  }

  return (
    <div className="revenue-by-client-rank">
      <div className="revenue-by-client-rank__header" role="row">
        <span className="revenue-by-client-rank__col revenue-by-client-rank__col--expand" aria-hidden>
          <span className="analytics-revenue-expand-spacer" />
        </span>
        <span className="revenue-by-client-rank__col revenue-by-client-rank__col--name">Name</span>
        <span className="revenue-by-client-rank__col revenue-by-client-rank__col--total">Total</span>
      </div>
      <div className="revenue-by-client-rank__body">
        {rows.map((row) => {
          const expanded = expandedKey === row.key;
          const trendUp = isTrendUp(row.series, row.rangeChangePct);
          const chartColor = trendChartColor(trendUp);
          const chartMax = Math.max(500, Math.ceil(Math.max(...row.series, 0) * 1.15));

          return (
            <div
              key={row.key}
              className={expanded ? 'revenue-by-client-rank__item is-expanded' : 'revenue-by-client-rank__item'}
            >
              <button
                type="button"
                className="revenue-by-client-rank__row"
                aria-expanded={expanded}
                onClick={() => setExpandedKey((current) => (current === row.key ? null : row.key))}
              >
                <span className="revenue-by-client-rank__col revenue-by-client-rank__col--expand">
                  <span className="analytics-revenue-expand-icon" aria-hidden>
                    {expanded ? (
                      <CaretDownOutlined style={{ fontSize: 11 }} />
                    ) : (
                      <CaretRightOutlined style={{ fontSize: 11 }} />
                    )}
                  </span>
                </span>
                <div className="revenue-by-client-rank__col revenue-by-client-rank__col--name">
                  <span className="revenue-by-client-rank__rank">#{row.rank}</span>
                  <span className="revenue-by-client-rank__name">{row.name}</span>
                </div>
                <div className="revenue-by-client-rank__col revenue-by-client-rank__col--total">
                  <Text strong className="revenue-by-client-rank__total">
                    {formatTotalShort(row.total)}
                  </Text>
                </div>
              </button>

              {expanded ? (
                <div className="revenue-by-client-rank__detail">
                  <div className="revenue-by-client-rank__detail-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        key={`${row.key}-${trendUp ? 'up' : 'down'}`}
                        data={row.series.map((revenue, index) => ({
                          period: periods[index] ?? '',
                          revenue,
                        }))}
                        margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient
                            id={`client-rank-fill-${row.key}-${trendUp ? 'up' : 'down'}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={chartColor} stopOpacity={trendUp ? 0.28 : 0.32} />
                            <stop offset="100%" stopColor={chartColor} stopOpacity={0.06} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e8e8e8' }} />
                        <YAxis
                          tickFormatter={(v) => axisMoneyShort(Number(v))}
                          domain={[0, chartMax]}
                          tick={{ fontSize: 12 }}
                          width={48}
                          axisLine={{ stroke: '#e8e8e8' }}
                        />
                        <RTooltip
                          formatter={(value) => [money(Number(value)), 'Revenue']}
                          labelFormatter={(label) => String(label)}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke={chartColor}
                          strokeWidth={2}
                          fill={`url(#client-rank-fill-${row.key}-${trendUp ? 'up' : 'down'})`}
                          dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: chartColor }}
                          activeDot={{ r: 5, fill: chartColor, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

