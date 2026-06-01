import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Card, Empty, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import type { DemoRepKey } from '../data/analyticsDemoSeries';
import {
  projectRowsForEorBillingClient,
  type EorBillingTableClientRow,
  type EorBillingTableProjectRow,
} from '../data/eorBillingDemo';
import type { DemoClientId } from '../data/demoClientCatalog';
import { EorProjectTag } from './EorProjectTag';
import { EorBillingBreakdownCell } from './EorBillingBreakdownCell';
import { formatMoneyValue } from '../utils/moneyFormat';

const { Text, Title } = Typography;

const NAME_COL_WIDTH = 280;
const PERIOD_COL_WIDTH = 112;
const TOTAL_COL_WIDTH = 140;
const PROJECT_NAME_INDENT = 72;

function clientInitials(name: string) {
  const parts = name.replace(/·/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts[0]?.toLowerCase() === 'client' && parts[1]) {
    return parts[1].slice(0, 2).toUpperCase();
  }
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '—').toUpperCase();
}

type ParentRow = EorBillingTableClientRow & { rowType: 'client' };
type ChildRow = EorBillingTableProjectRow & { rowType: 'project'; parentKey: DemoClientId };
type DisplayRow = ParentRow | ChildRow;

type EorBillingBreakdownTableProps = {
  filterScopeKey: string;
  rangeStartIdx: number;
  rangeEndIdx: number;
  selectedClientIds: DemoClientId[];
  selectedSalesKeys: DemoRepKey[];
  periods: string[];
  clientRows: EorBillingTableClientRow[];
  periodTotals: number[];
  grandTotal: number;
};

export function EorBillingBreakdownTable({
  filterScopeKey,
  rangeStartIdx,
  rangeEndIdx,
  selectedClientIds,
  selectedSalesKeys,
  periods,
  clientRows,
  periodTotals,
  grandTotal,
}: EorBillingBreakdownTableProps) {
  const [expandedClientKeys, setExpandedClientKeys] = useState<DemoClientId[]>([]);

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
    setExpandedClientKeys([]);
  }, [filterScopeKey]);

  const toggleClientExpanded = useCallback((clientKey: DemoClientId) => {
    setExpandedClientKeys((prev) =>
      prev.includes(clientKey) ? prev.filter((k) => k !== clientKey) : [...prev, clientKey],
    );
  }, []);

  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    for (const client of clientRows) {
      rows.push({ ...client, rowType: 'client' });
      if (!expandedClientKeys.includes(client.key)) continue;
      for (const project of projectRowsForEorBillingClient(client.key, filterParams)) {
        rows.push({ ...project, rowType: 'project', parentKey: client.key });
      }
    }
    return rows;
  }, [clientRows, expandedClientKeys, filterParams]);

  const scrollX = NAME_COL_WIDTH + periods.length * PERIOD_COL_WIDTH + TOTAL_COL_WIDTH;

  const columns: TableColumnsType<DisplayRow> = useMemo(
    () => [
      {
        title: 'Client Name',
        dataIndex: 'name',
        key: 'name',
        width: NAME_COL_WIDTH,
        render: (name: string, record) => {
          if (record.rowType === 'project') {
            return (
              <Space
                size={6}
                align="center"
                style={{ display: 'flex', paddingLeft: PROJECT_NAME_INDENT, fontSize: 13 }}
                wrap
              >
                <Text type="secondary">{name}</Text>
                <EorProjectTag />
              </Space>
            );
          }

          const expanded = expandedClientKeys.includes(record.key);

          return (
            <Space size={10} align="start">
              <span className="analytics-revenue-expand-icon" aria-hidden>
                {expanded ? (
                  <CaretDownOutlined style={{ fontSize: 11 }} />
                ) : (
                  <CaretRightOutlined style={{ fontSize: 11 }} />
                )}
              </span>
              <Avatar
                size={28}
                src={record.logoUrl}
                alt={name}
                style={{ flexShrink: 0, backgroundColor: record.color, border: '1px solid #f0f0f0' }}
              >
                {clientInitials(name)}
              </Avatar>
              <div className="analytics-revenue-client-name-block">
                <Text className="analytics-revenue-client-name-block__title">{name}</Text>
                <Text type="secondary" className="analytics-revenue-client-name-block__sales">
                  {record.salesName}
                </Text>
              </div>
            </Space>
          );
        },
      },
      ...periods.map((period, idx) => ({
        title: period,
        key: period,
        align: 'right' as const,
        width: PERIOD_COL_WIDTH,
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'project') {
            return (
              <EorBillingBreakdownCell
                amounts={record.monthlyAmounts[idx]!}
                muted
                showZeroAmount
              />
            );
          }
          return <Text>{formatMoneyValue(record.values[idx])}</Text>;
        },
      })),
      {
        title: 'Grand Total',
        key: 'total',
        align: 'right' as const,
        width: TOTAL_COL_WIDTH,
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'project') {
            const amounts = record.monthlyAmounts.reduce(
              (acc, month) => ({
                serviceFeeRevenue: acc.serviceFeeRevenue + month.serviceFeeRevenue,
                costs: acc.costs + month.costs,
                credit: acc.credit + month.credit,
              }),
              { serviceFeeRevenue: 0, costs: 0, credit: 0 },
            );
            return <EorBillingBreakdownCell amounts={amounts} muted showZeroAmount />;
          }
          return <Text strong>{formatMoneyValue(record.total)}</Text>;
        },
      },
    ],
    [expandedClientKeys, periods],
  );

  return (
    <Card
      bordered
      style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
      styles={{ body: { padding: '18px 18px 18px' } }}
    >
      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        EOR Breakdown
      </Title>
      <div className="analytics-revenue-table-scroll">
        <Table<DisplayRow>
          key={filterScopeKey}
          className="analytics-revenue-table"
          rowKey="key"
          columns={columns}
          scroll={{ x: scrollX }}
          dataSource={displayRows}
          rowClassName={(record) =>
            record.rowType === 'project'
              ? 'analytics-revenue-client-row'
              : 'analytics-revenue-rep-row analytics-revenue-rep-row--expandable'
          }
          onRow={(record) => {
            if (record.rowType !== 'client') return {};
            const expanded = expandedClientKeys.includes(record.key);
            return {
              onClick: () => toggleClientExpanded(record.key),
              style: { cursor: 'pointer' },
              'aria-expanded': expanded,
              'aria-label': expanded
                ? `Collapse projects for ${record.name}`
                : `Expand projects for ${record.name}`,
            };
          }}
          pagination={false}
          size="middle"
          bordered
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No EOR clients match the current filters in this period."
              />
            ),
          }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row style={{ background: 'rgba(70, 155, 255, 0.08)' }}>
                <Table.Summary.Cell index={0} align="right">
                  <Text strong>EOR Total</Text>
                </Table.Summary.Cell>
                {periods.map((period, idx) => (
                  <Table.Summary.Cell key={period} index={idx + 1} align="right">
                    <Text strong>{formatMoneyValue(periodTotals[idx])}</Text>
                  </Table.Summary.Cell>
                ))}
                <Table.Summary.Cell index={periods.length + 1} align="right">
                  <Text strong>{formatMoneyValue(grandTotal)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    </Card>
  );
}
