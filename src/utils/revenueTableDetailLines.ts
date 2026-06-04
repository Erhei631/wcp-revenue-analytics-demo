import {
  feeProfileForClientId,
  splitServiceFeeTotal,
  type FeeAmountProfile,
} from '../data/accountFeeProfiles';
import type { DemoClientId } from '../data/demoClientCatalog';
import { FEE_BREAKDOWN_LINE_LABELS } from '../data/eorBillingDemo';
import { coerceAmount, formatMoneyValue, moneyShort } from './moneyFormat';

const TOTAL_LINE_LABEL = 'Total';
const SERVICE_FEE_LINE_LABEL = 'EOR Service Fee';

export type FeeDetailLineKey = 'total' | 'equity' | 'cash' | 'serviceFee';

export type FeeDetailLineSpec = {
  key: FeeDetailLineKey;
  label: string;
  tone: 'total' | 'muted';
};

export type RevenueDetailProjectLine = {
  lineKey: FeeDetailLineKey;
  label: string;
  tone: 'total' | 'muted';
  values: number[];
  total: number;
};

export type RevenueDetailProjectRow = {
  rowType: 'detail-project';
  key: string;
  parentKey: string;
  entityName: string;
  nameIndent: number;
  lines: RevenueDetailProjectLine[];
  clientId?: DemoClientId | null;
  profile?: FeeAmountProfile;
  showZeroAmount: boolean;
  revenueOnly: boolean;
  eorProject: boolean;
  showEorTag?: boolean;
};

type LineAmounts = { key: FeeDetailLineKey; amount: number };

function lineAmountsForTotal(
  serviceFeeTotal: number,
  clientId?: DemoClientId | null,
  profile?: FeeAmountProfile,
  revenueOnly = false,
  eorProject = false,
): LineAmounts[] {
  const total = coerceAmount(serviceFeeTotal);
  const fee = splitServiceFeeTotal(total, profile ?? feeProfileForClientId(clientId), revenueOnly || eorProject);

  if (eorProject) {
    return [{ key: 'serviceFee', amount: fee.serviceFeeTotal }];
  }

  return [
    { key: 'total', amount: fee.serviceFeeTotal },
    { key: 'equity', amount: fee.equity },
    { key: 'cash', amount: fee.cash },
  ];
}

export function feeDetailLineSpecs(revenueOnly: boolean, eorProject: boolean): FeeDetailLineSpec[] {
  if (revenueOnly && !eorProject) return [];
  if (eorProject) {
    return [{ key: 'serviceFee', label: SERVICE_FEE_LINE_LABEL, tone: 'muted' }];
  }
  return [
    { key: 'total', label: TOTAL_LINE_LABEL, tone: 'total' },
    { key: 'equity', label: FEE_BREAKDOWN_LINE_LABELS.equity, tone: 'muted' },
    { key: 'cash', label: FEE_BREAKDOWN_LINE_LABELS.cash, tone: 'muted' },
  ];
}

export function buildRevenueDetailProjectRow(params: {
  rowKeyPrefix: string;
  parentKey: string;
  entityName: string;
  nameIndent?: number;
  periodValues: number[];
  rowTotal: number;
  clientId?: DemoClientId | null;
  profile?: FeeAmountProfile;
  showZeroAmount?: boolean;
  revenueOnly?: boolean;
  eorProject?: boolean;
  showEorTag?: boolean;
}): RevenueDetailProjectRow | null {
  const {
    rowKeyPrefix,
    parentKey,
    entityName,
    nameIndent = 88,
    periodValues,
    rowTotal,
    clientId,
    profile,
    showZeroAmount = false,
    revenueOnly = false,
    eorProject = false,
    showEorTag = false,
  } = params;

  const specs = feeDetailLineSpecs(revenueOnly, eorProject);
  if (specs.length === 0) return null;

  const lines: RevenueDetailProjectLine[] = specs.map((spec) => {
    const values = periodValues.map((periodTotal) => {
      const amounts = lineAmountsForTotal(periodTotal, clientId, profile, revenueOnly, eorProject);
      return amounts.find((line) => line.key === spec.key)?.amount ?? 0;
    });
    const totalLine = lineAmountsForTotal(rowTotal, clientId, profile, revenueOnly, eorProject);
    const total = totalLine.find((line) => line.key === spec.key)?.amount ?? 0;

    return {
      lineKey: spec.key,
      label: spec.label,
      tone: spec.tone,
      values,
      total,
    };
  });

  return {
    rowType: 'detail-project',
    key: rowKeyPrefix,
    parentKey,
    entityName,
    nameIndent,
    lines,
    clientId,
    profile,
    showZeroAmount,
    revenueOnly,
    eorProject,
    showEorTag,
  };
}

export function formatDetailLineAmount(
  amount: number,
  lineKey: FeeDetailLineKey,
  showZeroAmount: boolean,
): string {
  if (coerceAmount(amount) === 0 && !showZeroAmount) return '-';
  if (lineKey === 'equity' || lineKey === 'cash') {
    return moneyShort(amount);
  }
  return formatMoneyValue(amount);
}
