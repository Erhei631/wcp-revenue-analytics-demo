import { Typography } from 'antd';
import { EorProjectTag } from './EorProjectTag';
import { revenueTableOuterGridColumns } from '../constants/revenueTableLayout';
import {
  formatDetailLineAmount,
  type FeeDetailLineKey,
  type RevenueDetailProjectRow,
} from '../utils/revenueTableDetailLines';

const { Text } = Typography;

type RevenueExpandedProjectGridProps = {
  record: RevenueDetailProjectRow;
  periodCount: number;
};

function lineToneClass(lineKey: FeeDetailLineKey, tone: 'total' | 'muted') {
  if (lineKey === 'serviceFee') return 'service-fee';
  return tone === 'total' ? 'total' : lineKey;
}

export function RevenueExpandedProjectGrid({ record, periodCount }: RevenueExpandedProjectGridProps) {
  const lineCount = record.lines.length;
  const amountColStart = 2;

  return (
    <div
      className="analytics-revenue-expanded-project"
      style={{ gridTemplateColumns: revenueTableOuterGridColumns(periodCount) }}
      role="rowgroup"
      aria-label={`${record.entityName} fee breakdown`}
    >
      <div
        className="analytics-revenue-expanded-project__client-area analytics-revenue-expanded-project__client-area--split"
        style={{ gridRow: `1 / span ${lineCount}` }}
      >
        <div
          className="analytics-revenue-expanded-project__name analytics-revenue-expanded-project__project-info"
          style={{ gridRow: `1 / span ${lineCount}` }}
        >
          <Text type="secondary" className="analytics-revenue-expanded-project__name-text">
            {record.entityName}
          </Text>
          {record.showEorTag ? (
            <span className="analytics-revenue-expanded-project__tag">
              <EorProjectTag />
            </span>
          ) : null}
        </div>

        {record.lines.map((line, rowIndex) => {
          const toneClass = lineToneClass(line.lineKey, line.tone);
          const isTotalLine = line.tone === 'total';

          return (
            <div
              key={line.lineKey}
              className={`analytics-revenue-expanded-project__metric analytics-revenue-expanded-project__metric--${toneClass}`}
              style={{ gridColumn: 2, gridRow: rowIndex + 1 }}
            >
              <Text
                type={isTotalLine ? undefined : 'secondary'}
                strong={isTotalLine}
                className="analytics-revenue-expanded-project__metric-text"
              >
                {line.label}
              </Text>
            </div>
          );
        })}
      </div>

      {record.lines.map((line, rowIndex) => {
        const row = rowIndex + 1;
        const toneClass = lineToneClass(line.lineKey, line.tone);
        const isTotalLine = line.tone === 'total';

        return (
          <ExpandedProjectAmountCells
            key={`${line.lineKey}-amounts`}
            line={line}
            row={row}
            periodCount={periodCount}
            amountColStart={amountColStart}
            showZeroAmount={record.showZeroAmount}
            toneClass={toneClass}
            isTotalLine={isTotalLine}
          />
        );
      })}
    </div>
  );
}

type ExpandedProjectAmountCellsProps = {
  line: RevenueDetailProjectRow['lines'][number];
  row: number;
  periodCount: number;
  amountColStart: number;
  showZeroAmount: boolean;
  toneClass: string;
  isTotalLine: boolean;
};

function ExpandedProjectAmountCells({
  line,
  row,
  periodCount,
  amountColStart,
  showZeroAmount,
  toneClass,
  isTotalLine,
}: ExpandedProjectAmountCellsProps) {
  const totalCol = amountColStart + periodCount;

  return (
    <>
      {line.values.map((amount, periodIndex) => (
        <div
          key={`${line.lineKey}-p${periodIndex}`}
          className={`analytics-revenue-expanded-project__amount analytics-revenue-expanded-project__amount--${toneClass}`}
          style={{ gridColumn: amountColStart + periodIndex, gridRow: row }}
        >
          <Text
            type={isTotalLine ? undefined : 'secondary'}
            strong={isTotalLine}
            className="analytics-revenue-expanded-project__amount-text"
          >
            {formatDetailLineAmount(amount, line.lineKey, showZeroAmount)}
          </Text>
        </div>
      ))}
      <div
        className={`analytics-revenue-expanded-project__amount analytics-revenue-expanded-project__amount--grand-total analytics-revenue-expanded-project__amount--${toneClass}`}
        style={{ gridColumn: totalCol, gridRow: row }}
      >
        <Text
          type={isTotalLine ? undefined : 'secondary'}
          strong={isTotalLine}
          className="analytics-revenue-expanded-project__amount-text"
        >
          {formatDetailLineAmount(line.total, line.lineKey, showZeroAmount)}
        </Text>
      </div>
    </>
  );
}

export function expandedProjectTableCellProps(
  record: { rowType: string },
  columnKey: string,
  nameColumnKey: string,
  columnCount: number,
) {
  if (record.rowType !== 'detail-project') return {};
  if (columnKey === nameColumnKey) {
    return { colSpan: columnCount, className: 'analytics-revenue-expanded-project-cell' };
  }
  return { colSpan: 0 };
}
