import {
  EOR_BILLING_BREAKDOWN_CELL_LABELS,
  type EorBillingAmounts,
  type EorBillingTableProjectRow,
} from '../data/eorBillingDemo';
import type { DemoClientId } from '../data/demoClientCatalog';
import { coerceAmount, formatMoneyValue, moneyShort } from './moneyFormat';

const TOTAL_LINE_LABEL = 'Total';

export type EorBillingDetailLineKey = 'total' | 'serviceFee' | 'costs' | 'deposit';

export type EorBillingDetailProjectLine = {
  lineKey: EorBillingDetailLineKey;
  label: string;
  tone: 'total' | 'muted';
  values: number[];
  total: number;
};

export type EorBillingDetailProjectRow = {
  rowType: 'detail-project';
  key: string;
  parentKey: DemoClientId;
  entityName: string;
  lines: EorBillingDetailProjectLine[];
  showZeroAmount: boolean;
  showEorTag: boolean;
};

function totalOfAmounts(amounts: EorBillingAmounts): number {
  return (
    coerceAmount(amounts.serviceFeeRevenue) +
    coerceAmount(amounts.costs) +
    coerceAmount(amounts.credit)
  );
}

function sumMonthly(
  monthlyAmounts: EorBillingAmounts[],
  pick: (amounts: EorBillingAmounts) => number,
): number {
  return monthlyAmounts.reduce((sum, month) => sum + coerceAmount(pick(month)), 0);
}

export function formatEorBillingLineAmount(
  amount: number,
  lineKey: EorBillingDetailLineKey,
  showZeroAmount: boolean,
): string {
  if (coerceAmount(amount) === 0 && !showZeroAmount) return '-';
  if (lineKey === 'total') return formatMoneyValue(amount);
  return moneyShort(amount);
}

export function buildEorBillingDetailProjectRow(
  project: EorBillingTableProjectRow,
  parentKey: DemoClientId,
): EorBillingDetailProjectRow {
  const lineDefs: Array<{
    lineKey: EorBillingDetailLineKey;
    label: string;
    tone: 'total' | 'muted';
    pick: (amounts: EorBillingAmounts) => number;
  }> = [
    { lineKey: 'total', label: TOTAL_LINE_LABEL, tone: 'total', pick: totalOfAmounts },
    {
      lineKey: 'serviceFee',
      label: EOR_BILLING_BREAKDOWN_CELL_LABELS.serviceFee,
      tone: 'muted',
      pick: (a) => a.serviceFeeRevenue,
    },
    {
      lineKey: 'costs',
      label: EOR_BILLING_BREAKDOWN_CELL_LABELS.costs,
      tone: 'muted',
      pick: (a) => a.costs,
    },
    {
      lineKey: 'deposit',
      label: EOR_BILLING_BREAKDOWN_CELL_LABELS.deposit,
      tone: 'muted',
      pick: (a) => a.credit,
    },
  ];

  const lines: EorBillingDetailProjectLine[] = lineDefs.map((def) => ({
    lineKey: def.lineKey,
    label: def.label,
    tone: def.tone,
    values: project.monthlyAmounts.map((month) => coerceAmount(def.pick(month))),
    total: sumMonthly(project.monthlyAmounts, def.pick),
  }));

  return {
    rowType: 'detail-project',
    key: project.key,
    parentKey,
    entityName: project.name,
    lines,
    showZeroAmount: true,
    showEorTag: true,
  };
}
