import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Card, Empty, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { projectRowsForNewLogoClient, type NewLogoProjectRow } from '../data/newLogoDemo';
import type { DemoClientId } from '../data/demoClientCatalog';
import { ServiceFeeBreakdownCell } from './ServiceFeeBreakdownCell';
import { coerceAmount, formatMoneyValue } from '../utils/moneyFormat';

const { Text, Title } = Typography;

const NAME_COL_WIDTH = 280;
const PERIOD_COL_WIDTH = 112;
const TOTAL_COL_WIDTH = 140;

export type NewLogoClientRow = {
  key: DemoClientId;
  name: string;
  /** Account owner / sales rep display name. */
  salesName: string;
  color: string;
  logoUrl: string;
  values: number[];
  total: number;
};

type NoDataRow = {
  rowType: 'no-data';
  key: string;
  parentKey: DemoClientId;
};

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

type ParentRow = NewLogoClientRow & { rowType: 'client' };
type ChildRow = NewLogoProjectRow & { rowType: 'project'; parentKey: DemoClientId };
type DisplayRow = ParentRow | ChildRow | NoDataRow;

type NewLogosBreakdownTableProps = {
  filterScopeKey: string;
  periods: string[];
  clientRows: NewLogoClientRow[];
  periodTotals: number[];
  grandTotal: number;
  clientScopeLabel?: string | null;
};

function clientRowExpandable(client: NewLogoClientRow) {
  return projectRowsForNewLogoClient(client.key, client.values).length > 0;
}

function shouldShowNoDataOnExpand(client: NewLogoClientRow): boolean {
  return projectRowsForNewLogoClient(client.key, client.values).length === 0;
}

export function NewLogosBreakdownTable({
  filterScopeKey,
  periods,
  clientRows,
  periodTotals,
  grandTotal,
  clientScopeLabel,
}: NewLogosBreakdownTableProps) {
  const [expandedClientKeys, setExpandedClientKeys] = useState<DemoClientId[]>([]);

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
      if (shouldShowNoDataOnExpand(client)) {
        rows.push({ rowType: 'no-data', key: `${client.key}::no-data`, parentKey: client.key });
        continue;
      }
      for (const project of projectRowsForNewLogoClient(client.key, client.values)) {
        rows.push({ ...project, rowType: 'project', parentKey: client.key });
      }
    }
    return rows;
  }, [clientRows, expandedClientKeys]);

  const scrollX = NAME_COL_WIDTH + periods.length * PERIOD_COL_WIDTH + TOTAL_COL_WIDTH;
  const columnCount = periods.length + 2;

  const columns: TableColumnsType<DisplayRow> = useMemo(
    () => {
      const hideNoDataCell = (record: DisplayRow) =>
        record.rowType === 'no-data' ? { colSpan: 0 } : {};

      return [
      {
        title: 'Client Name',
        dataIndex: 'name',
        key: 'name',
        width: NAME_COL_WIDTH,
        onCell: (record) =>
          record.rowType === 'no-data'
            ? { colSpan: columnCount, className: 'analytics-revenue-no-data-cell' }
            : {},
        render: (name: string, record) => {
          if (record.rowType === 'no-data') {
            return (
              <Text type="secondary" className="analytics-revenue-no-data-cell__label">
                No Data
              </Text>
            );
          }

          if (record.rowType === 'project') {
            return (
              <Text
                type="secondary"
                style={{ display: 'block', paddingLeft: PROJECT_NAME_INDENT, fontSize: 13 }}
              >
                {name}
              </Text>
            );
          }

          const expandable = clientRowExpandable(record);
          const expanded = expandedClientKeys.includes(record.key);

          return (
            <Space size={10} align="start">
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
      ...periods.map((p, idx) => ({
        title: p,
        key: p,
        align: 'right' as const,
        width: PERIOD_COL_WIDTH,
        onCell: hideNoDataCell,
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'no-data') return null;
          const amount = coerceAmount(record.values[idx]);
          if (record.rowType === 'project') {
            return (
              <ServiceFeeBreakdownCell
                serviceFeeTotal={amount}
                clientId={record.clientId}
                muted
                showZeroAmount
              />
            );
          }
          return <Text>{formatMoneyValue(amount)}</Text>;
        },
      })),
      {
        title: 'Grand Total',
        key: 'total',
        align: 'right' as const,
        width: TOTAL_COL_WIDTH,
        onCell: hideNoDataCell,
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'no-data') return null;
          if (record.rowType === 'project') {
            return (
              <ServiceFeeBreakdownCell
                serviceFeeTotal={record.total}
                clientId={record.clientId}
                muted
                showZeroAmount
              />
            );
          }
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
        New Logos
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
          scroll={{ x: scrollX }}
          dataSource={displayRows}
          rowClassName={(record) => {
            if (record.rowType === 'project' || record.rowType === 'no-data') {
              return 'analytics-revenue-client-row';
            }
            return clientRowExpandable(record)
              ? 'analytics-revenue-rep-row analytics-revenue-rep-row--expandable'
              : 'analytics-revenue-rep-row';
          }}
          onRow={(record) => {
            if (record.rowType !== 'client' || !clientRowExpandable(record)) {
              return {};
            }
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
                description="No new logos in this period for the current filters."
              />
            ),
          }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row style={{ background: 'rgba(70, 155, 255, 0.08)' }}>
                <Table.Summary.Cell index={0} align="right">
                  <Text strong>New Logos Total</Text>
                </Table.Summary.Cell>
                {periods.map((p, idx) => (
                  <Table.Summary.Cell key={p} index={idx + 1} align="right">
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
