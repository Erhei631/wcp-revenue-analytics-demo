import type { ReactNode } from 'react';
import { Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { DashboardShell } from '../layout/DashboardShell';
import { BillingFilterBar } from '../components/billing/BillingFilterBar';
import { RevenueAnalyticsToolbarButton } from '../components/billing/BillingToolbarRightActions';

const { Text, Title } = Typography;

const MONTH_KEYS = [
  '2025-12',
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
] as const;

function formatBillingDateRangeLabel(keys: readonly (typeof MONTH_KEYS)[number][]) {
  const formatOne = (key: (typeof MONTH_KEYS)[number]) => {
    const [y, m] = key.split('-').map(Number);
    const mon = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
    return `${mon}, ${y}`;
  };
  if (keys.length === 0) return '';
  if (keys.length === 1) return formatOne(keys[0]);
  return `${formatOne(keys[0])} - ${formatOne(keys[keys.length - 1])}`;
}

function monthLabel(key: (typeof MONTH_KEYS)[number]) {
  const [y, m] = key.split('-').map(Number);
  const mon = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
  return `${mon}, ${String(y).slice(-2)}`;
}

function Dash() {
  return (
    <Text type="secondary" style={{ fontSize: 13 }}>
      —
    </Text>
  );
}

function SummaryCell({ equity, invoice }: { equity: string; invoice: string }) {
  return (
    <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
      <Text type="secondary">Equity total: {equity}</Text>
      <Text type="secondary">Invoice total: {invoice}</Text>
    </Space>
  );
}

function AlertBox({ children }: { children: string }) {
  return (
    <div
      style={{
        border: '1px dashed #ff4d4f',
        padding: '4px 8px',
        borderRadius: 4,
        color: '#cf1322',
        fontSize: 12,
        display: 'inline-block',
        lineHeight: 1.3,
      }}
    >
      {children}
    </div>
  );
}

type BillingRow = {
  key: string;
  name: string;
  kind: 'client' | 'project';
  tags?: ('eor' | 'incubation')[];
  cells: Partial<Record<(typeof MONTH_KEYS)[number], ReactNode>>;
  children?: BillingRow[];
};

const treeData: BillingRow[] = [
  {
    key: 'c-11111',
    name: '11111',
    kind: 'client',
    cells: {
      '2025-12': <SummaryCell equity="$0.00" invoice="$0.00" />,
      '2026-01': <SummaryCell equity="$5,111.20" invoice="$1,565.80" />,
      '2026-02': <SummaryCell equity="$4,200.00" invoice="$2,100.00" />,
      '2026-03': <SummaryCell equity="$3,450.00" invoice="$980.00" />,
      '2026-04': <Dash />,
      '2026-05': (
        <Text style={{ color: '#1677ff', fontSize: 12 }}>202605-01 Invoice</Text>
      ),
    },
    children: [
      {
        key: 'p-666',
        name: '666',
        kind: 'project',
        tags: ['eor'],
        cells: {
          '2026-01': (
            <Text style={{ color: '#1677ff', fontSize: 12 }}>
              Invoice Confirmed
            </Text>
          ),
          '2026-02': <Dash />,
          '2026-03': <AlertBox>5171 (202603-01)</AlertBox>,
        },
      },
      {
        key: 'p-888',
        name: '888',
        kind: 'project',
        tags: ['incubation'],
        cells: {
          '2026-01': <Dash />,
          '2026-02': (
            <Text style={{ color: '#1677ff', fontSize: 12 }}>
              Invoice Confirmed
            </Text>
          ),
          '2026-03': <Dash />,
        },
      },
      {
        key: 'p-777',
        name: '777',
        kind: 'project',
        cells: {
          '2026-01': <AlertBox>5171 (202601-01)</AlertBox>,
          '2026-02': <Dash />,
          '2026-03': (
            <Text style={{ color: '#1677ff', fontSize: 12 }}>
              Invoice Confirmed
            </Text>
          ),
        },
      },
      {
        key: 'p-rfd',
        name: 'rfdddfdf',
        kind: 'project',
        cells: {},
      },
      {
        key: 'p-eor',
        name: 'EOR project',
        kind: 'project',
        tags: ['eor'],
        cells: {
          '2026-01': <Dash />,
          '2026-02': <Dash />,
          '2026-03': (
            <Text style={{ color: '#1677ff', fontSize: 12 }}>
              Invoice Confirmed
            </Text>
          ),
        },
      },
      {
        key: 'p-eortest',
        name: 'eor test',
        kind: 'project',
        cells: {},
      },
    ],
  },
];

export default function BillingDashboardPage() {
  const columns: TableColumnsType<BillingRow> = [
    {
      title: (
        <Space size={6}>
          <span>Clients & Projects</span>
        </Space>
      ),
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 280,
      render: (_, record) => (
        <Space size={8} wrap align="center">
          <Text strong={record.kind === 'client'} style={{ fontSize: record.kind === 'client' ? 14 : 13 }}>
            {record.name}
          </Text>
          {record.tags?.includes('eor') ? (
            <Tag color="purple" style={{ marginInlineEnd: 0 }}>
              EOR
            </Tag>
          ) : null}
          {record.tags?.includes('incubation') ? (
            <Tag color="processing" style={{ marginInlineEnd: 0 }}>
              Incubation
            </Tag>
          ) : null}
        </Space>
      ),
    },
    ...MONTH_KEYS.map((mk) => ({
      title: monthLabel(mk),
      key: mk,
      width: 148,
      align: 'left' as const,
      onHeaderCell: () => ({
        style: {
          background: '#e8eef5',
          color: '#1f1f1f',
          fontWeight: 600,
          fontSize: 12,
        },
      }),
      render: (_: unknown, record: BillingRow) => record.cells[mk] ?? <Dash />,
    })),
  ];

  return (
    <DashboardShell selectedMenuKey="billing-dashboard">
      <div style={{ padding: '20px 24px 24px', background: '#f4f6f9', minHeight: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Billing Dashboard
          </Title>
          <RevenueAnalyticsToolbarButton revenueAnalyticsTo="/revenue-analytics" />
        </div>

        <section className="billing-board-card">
          <div className="billing-board-card__toolbar">
            <BillingFilterBar dateRangeLabel={formatBillingDateRangeLabel(MONTH_KEYS)} />
          </div>
          <div className="billing-board-card__table">
            <Table<BillingRow>
              columns={columns}
              dataSource={treeData}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
              expandable={{ defaultExpandAllRows: true }}
              rowClassName={(record) =>
                record.kind === 'client' ? 'billing-row-client' : 'billing-row-project'
              }
            />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}