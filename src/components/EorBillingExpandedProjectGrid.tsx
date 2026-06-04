import { Typography } from 'antd';
import { EorProjectTag } from './EorProjectTag';
import { eorBillingTableOuterGridColumns } from '../constants/revenueTableLayout';
import {
  formatEorBillingLineAmount,
  type EorBillingDetailLineKey,
  type EorBillingDetailProjectRow,
} from '../utils/eorBillingTableDetail';

const { Text } = Typography;

type EorBillingExpandedProjectGridProps = {
  record: EorBillingDetailProjectRow;
  periodCount: number;
};

function lineToneClass(lineKey: EorBillingDetailLineKey, tone: 'total' | 'muted') {
  if (lineKey === 'serviceFee') return 'service-fee';
  return tone === 'total' ? 'total' : lineKey;
}

export function EorBillingExpandedProjectGrid({
  record,
  periodCount,
}: EorBillingExpandedProjectGridProps) {
  const lineCount = record.lines.length;
  const amountColStart = 2;

  return (
    <div
      className="analytics-revenue-expanded-project"
      style={{ gridTemplateColumns: eorBillingTableOuterGridColumns(periodCount) }}
      role="rowgroup"
      aria-label={`${record.entityName} EOR billing breakdown`}
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
        const totalCol = amountColStart + periodCount;

        return (
          <EorBillingExpandedAmountCells
            key={`${line.lineKey}-amounts`}
            line={line}
            row={row}
            periodCount={periodCount}
            amountColStart={amountColStart}
            totalCol={totalCol}
            showZeroAmount={record.showZeroAmount}
            toneClass={toneClass}
            isTotalLine={isTotalLine}
          />
        );
      })}
    </div>
  );
}

type EorBillingExpandedAmountCellsProps = {
  line: EorBillingDetailProjectRow['lines'][number];
  row: number;
  periodCount: number;
  amountColStart: number;
  totalCol: number;
  showZeroAmount: boolean;
  toneClass: string;
  isTotalLine: boolean;
};

function EorBillingExpandedAmountCells({
  line,
  row,
  amountColStart,
  totalCol,
  showZeroAmount,
  toneClass,
  isTotalLine,
}: EorBillingExpandedAmountCellsProps) {
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
            {formatEorBillingLineAmount(amount, line.lineKey, showZeroAmount)}
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
          {formatEorBillingLineAmount(line.total, line.lineKey, showZeroAmount)}
        </Text>
      </div>
    </>
  );
}
