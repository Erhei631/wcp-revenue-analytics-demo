import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Card, Empty, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { clientHasEorProject } from '../data/collectionClientDemo';
import {
  isNewLogoEorDemoClient,
  projectRowsForNewLogoClient,
  projectsForNewLogoClient,
} from '../data/newLogoDemo';
import type { DemoClientId } from '../data/demoClientCatalog';
import {
  REVENUE_GRAND_TOTAL_COL_WIDTH,
  REVENUE_PERIOD_COL_MIN_WIDTH,
  REVENUE_PROJECT_NAME_INDENT,
  REVENUE_SALES_REP_COL_WIDTH,
  revenueTableScrollWidth,
} from '../constants/revenueTableLayout';
import {
  expandedProjectTableCellProps,
  RevenueExpandedProjectGrid,
} from './RevenueExpandedProjectGrid';
import { coerceAmount, formatMoneyValue } from '../utils/moneyFormat';
import {
  buildRevenueDetailProjectRow,
  type RevenueDetailProjectRow,
} from '../utils/revenueTableDetailLines';

const { Text, Title } = Typography;


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
type DisplayRow = ParentRow | RevenueDetailProjectRow | NoDataRow;

function isDetailProjectRow(record: DisplayRow): record is RevenueDetailProjectRow {
  return record.rowType === 'detail-project';
}

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
        const detailRow = buildRevenueDetailProjectRow({
          rowKeyPrefix: project.key,
          parentKey: client.key,
          entityName: project.name,
            nameIndent: REVENUE_PROJECT_NAME_INDENT,
          periodValues: project.values,
          rowTotal: project.total,
          clientId: project.clientId,
          showZeroAmount: true,
          revenueOnly,
          eorProject: project.eor,
          showEorTag: project.eor,
        });
        if (detailRow) rows.push(detailRow);
      }
    }
    return rows;
  }, [expandedClientKeys, revenueOnly, visibleClientRows]);

  const scrollX = revenueTableScrollWidth(periods.length);
  const columnCount = periods.length + 2;

  const columns: TableColumnsType<DisplayRow> = useMemo(
    () => {
      const hideNoDataCell = (record: DisplayRow) =>
        record.rowType === 'no-data' ? { colSpan: 0 } : {};

      const projectCellProps = (record: DisplayRow, columnKey: string) => {
        if (record.rowType === 'no-data' && columnKey === 'name') {
          return { colSpan: columnCount, className: 'analytics-revenue-no-data-cell' };
        }
        if (record.rowType === 'no-data') return hideNoDataCell(record);
        return expandedProjectTableCellProps(record, columnKey, 'name', columnCount);
      };

      return [
      {
        title: 'Client Name',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: REVENUE_SALES_REP_COL_WIDTH,
        onCell: (record) => projectCellProps(record, 'name'),
        render: (name: string, record) => {
          if (record.rowType === 'no-data') {
            return (
              <Text type="secondary" className="analytics-revenue-no-data-cell__label">
                No Data
              </Text>
            );
          }

          if (isDetailProjectRow(record)) {
            return <RevenueExpandedProjectGrid record={record} periodCount={periods.length} />;
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
        minWidth: REVENUE_PERIOD_COL_MIN_WIDTH,
        onCell: (record: DisplayRow) => projectCellProps(record, p),
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'no-data' || isDetailProjectRow(record)) return null;
          const amount = coerceAmount(record.values[idx]);
          return <Text>{formatMoneyValue(amount)}</Text>;
        },
      })),
      {
        title: 'Grand Total',
        key: 'total',
        align: 'right' as const,
        width: REVENUE_GRAND_TOTAL_COL_WIDTH,
        onCell: (record) => projectCellProps(record, 'total'),
        render: (_: unknown, record: DisplayRow) => {
          if (record.rowType === 'no-data' || isDetailProjectRow(record)) return null;
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
          sticky
          scroll={{ x: scrollX }}
          dataSource={displayRows}
          rowClassName={(record) => {
            if (isDetailProjectRow(record)) {
              return 'analytics-revenue-expanded-project-row';
            }
            if (record.rowType === 'no-data') {
              return 'analytics-revenue-detail-row';
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
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} align="right" className="analytics-revenue-table__summary-first">
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
