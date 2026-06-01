import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Card, Empty, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { clientHasEorProject } from '../data/collectionClientDemo';
import {
  isNewLogoEorDemoClient,
  projectRowsForNewLogoClient,
  projectsForNewLogoClient,
  type NewLogoProjectRow,
} from '../data/newLogoDemo';
import type { DemoClientId } from '../data/demoClientCatalog';
import { EorProjectTag } from './EorProjectTag';
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
  /** EOR projects: revenue only, no Equity / Cash breakdown. */
  revenueOnly?: boolean;
};

function projectRowsForDisplay(client: NewLogoClientRow, eorOnly: boolean) {
  const rows = projectRowsForNewLogoClient(client.key, client.values);
  if (!eorOnly) return rows;
  return rows.filter((row) => row.eor);
}

function clientHasEorProjects(client: NewLogoClientRow) {
  const hasEorProject = projectsForNewLogoClient(client.key).some((p) => p.eor);
  if (isNewLogoEorDemoClient(client.key)) return hasEorProject;
  return clientHasEorProject(client.key) && hasEorProject;
}

function clientRowExpandable(client: NewLogoClientRow, eorOnly: boolean) {
  return projectRowsForDisplay(client, eorOnly).length > 0;
}

function shouldShowNoDataOnExpand(client: NewLogoClientRow, eorOnly: boolean) {
  return projectRowsForDisplay(client, eorOnly).length === 0;
}

export function NewLogosBreakdownTable({
  filterScopeKey,
  periods,
  clientRows,
  periodTotals,
  grandTotal,
  clientScopeLabel,
  revenueOnly = false,
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

  const visibleClientRows = useMemo(() => {
    if (!revenueOnly) return clientRows;
    return clientRows.filter(clientHasEorProjects);
  }, [clientRows, revenueOnly]);

  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    for (const client of visibleClientRows) {
      rows.push({ ...client, rowType: 'client' });
      if (!expandedClientKeys.includes(client.key)) continue;
      if (shouldShowNoDataOnExpand(client, revenueOnly)) {
        rows.push({ rowType: 'no-data', key: `${client.key}::no-data`, parentKey: client.key });
        continue;
      }
      for (const project of projectRowsForDisplay(client, revenueOnly)) {
        rows.push({ ...project, rowType: 'project', parentKey: client.key });
      }
    }
    return rows;
  }, [expandedClientKeys, revenueOnly, visibleClientRows]);

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
              <Space
                size={6}
                align="center"
                style={{ display: 'flex', paddingLeft: PROJECT_NAME_INDENT, fontSize: 13 }}
                wrap
              >
                <Text type="secondary">{name}</Text>
                {record.eor ? <EorProjectTag /> : null}
              </Space>
            );
          }

          const expandable = clientRowExpandable(record, revenueOnly);
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
                revenueOnly={revenueOnly}
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
                revenueOnly={revenueOnly}
              />
            );
          }
          return <Text strong>{formatMoneyValue(record.total)}</Text>;
        },
      },
    ];
    },
    [columnCount, expandedClientKeys, periods, revenueOnly],
  );

  return (
    <Card
      bordered
      style={{ borderRadius: 8, marginBottom: 20, borderColor: '#f0f0f0' }}
      styles={{ body: { padding: '18px 18px 18px' } }}
    >
      <div style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
          New Logos
          {!revenueOnly && clientScopeLabel ? (
            <Text type="secondary" style={{ fontWeight: 400, marginLeft: 6 }}>
              · {clientScopeLabel}
            </Text>
          ) : null}
        </Title>
        <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
          Sorted by newest projects first
        </Text>
      </div>
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
            return clientRowExpandable(record, revenueOnly)
              ? 'analytics-revenue-rep-row analytics-revenue-rep-row--expandable'
              : 'analytics-revenue-rep-row';
          }}
          onRow={(record) => {
            if (record.rowType !== 'client' || !clientRowExpandable(record, revenueOnly)) {
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
                description={
                  revenueOnly
                    ? 'No EOR new-logo projects in this period for the current filters.'
                    : 'No new logos in this period for the current filters.'
                }
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
