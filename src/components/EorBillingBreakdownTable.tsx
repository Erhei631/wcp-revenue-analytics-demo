import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Card, Empty, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import type { DemoRepKey } from '../data/analyticsDemoSeries';
import {
  projectRowsForEorBillingClient,
  type EorBillingTableClientRow,
} from '../data/eorBillingDemo';
import type { DemoClientId } from '../data/demoClientCatalog';
import {
  EOR_BILLING_CLIENT_NAME_COL_WIDTH,
  EOR_BILLING_PERIOD_COL_MIN_WIDTH,
  eorBillingTableScrollWidth,
  REVENUE_GRAND_TOTAL_COL_WIDTH,
} from '../constants/revenueTableLayout';
import { expandedProjectTableCellProps } from './RevenueExpandedProjectGrid';
import { EorBillingExpandedProjectGrid } from './EorBillingExpandedProjectGrid';
import { coerceAmount, formatMoneyValue } from '../utils/moneyFormat';
import {
  buildEorBillingDetailProjectRow,
  type EorBillingDetailProjectRow,
} from '../utils/eorBillingTableDetail';

const { Text, Title } = Typography;

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
type DisplayRow = ParentRow | EorBillingDetailProjectRow;

function isDetailProjectRow(record: DisplayRow): record is EorBillingDetailProjectRow {
  return record.rowType === 'detail-project';
}

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
        rows.push(buildEorBillingDetailProjectRow(project, client.key));
      }
    }
    return rows;
  }, [clientRows, expandedClientKeys, filterParams]);

  const scrollX = eorBillingTableScrollWidth(periods.length);
  const columnCount = periods.length + 2;

  const columns: TableColumnsType<DisplayRow> = useMemo(
    () => {
      const projectCellProps = (record: DisplayRow, columnKey: string) =>
        expandedProjectTableCellProps(record, columnKey, 'name', columnCount);

      return [
        {
          title: 'Client Name',
          dataIndex: 'name',
          key: 'name',
          fixed: 'left',
          width: EOR_BILLING_CLIENT_NAME_COL_WIDTH,
          onCell: (record) => projectCellProps(record, 'name'),
          render: (name: string, record) => {
            if (isDetailProjectRow(record)) {
              return <EorBillingExpandedProjectGrid record={record} periodCount={periods.length} />;
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
          minWidth: EOR_BILLING_PERIOD_COL_MIN_WIDTH,
          onCell: (record: DisplayRow) => projectCellProps(record, period),
          render: (_: unknown, record: DisplayRow) => {
            if (isDetailProjectRow(record)) return null;
            return <Text>{formatMoneyValue(coerceAmount(record.values[idx]))}</Text>;
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
            return <Text strong>{formatMoneyValue(record.total)}</Text>;
          },
        },
      ];
    },
    [columnCount, expandedClientKeys, periods],
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
          className="analytics-revenue-table analytics-revenue-table--eor-billing"
          rowKey="key"
          columns={columns}
          sticky
          scroll={{ x: scrollX }}
          dataSource={displayRows}
          rowClassName={(record) =>
            isDetailProjectRow(record)
              ? 'analytics-revenue-expanded-project-row'
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
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} align="right" className="analytics-revenue-table__summary-first">
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
