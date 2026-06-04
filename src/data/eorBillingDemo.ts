import {
  buildAllRepMonthlySeries,
  DEMO_MONTH_COUNT,
  DEMO_PERIOD_LABELS,
  type DemoRepKey,
} from './analyticsDemoSeries';
import {
  buildClientMonthlyFromReps,
  clientLogoUrl,
  DEMO_CLIENT_CATALOG,
  type DemoClientId,
} from './demoClientCatalog';
import { COLLECTION_CLIENT_GROUPS } from './collectionClientDemo';
import { eorRevenueFraction } from './eorProjectDemo';
import {
  isNewLogoEorDemoClient,
  newLogoEorDemoValues,
  projectsForNewLogoClient,
} from './newLogoDemo';
import { coerceAmount } from '../utils/moneyFormat';

/** User-facing labels for EOR billing line items (KPI, charts, tables). */
export const EOR_BILLING_ITEM_LABELS = {
  serviceFee: 'EOR Service Fee',
  passThroughCosts: 'Pass-Through Costs',
  securityDeposit: 'Security Deposit',
} as const;

/** Section titles on the EOR Billing tab. */
export const EOR_BILLING_SECTION_LABELS = {
  itemsTrend: 'EOR Billing Items Trend',
  clientOverview: 'Client Overview',
  breakdown: 'EOR Breakdown',
} as const;

/** Shared table / summary labels for EOR billing views. */
export const EOR_BILLING_TABLE_LABELS = {
  clientName: 'Client Name',
  grandTotal: 'Grand Total',
  eorTotal: 'EOR Total',
  total: 'Total',
  paid: 'Paid',
  unpaid: 'Unpaid',
  projects: 'Projects',
} as const;

/** Equity / Cash breakdown rows (Revenue Analytics tables). */
export const FEE_BREAKDOWN_LINE_LABELS = {
  equity: 'Equity',
  cash: 'Cash',
} as const;

/** Short labels for stacked amounts in EOR breakdown table cells. */
export const EOR_BILLING_BREAKDOWN_CELL_LABELS = {
  serviceFee: EOR_BILLING_ITEM_LABELS.serviceFee,
  costs: EOR_BILLING_ITEM_LABELS.passThroughCosts,
  deposit: EOR_BILLING_ITEM_LABELS.securityDeposit,
} as const;

/** Tooltip copy for EOR billing KPI titles. */
export const EOR_BILLING_ITEM_HINTS: Record<keyof typeof EOR_BILLING_ITEM_LABELS, string> = {
  serviceFee:
    'The fee charged for EOR services such as employment administration, payroll, and compliance.',
  passThroughCosts:
    'Employee-related costs paid on behalf of the client, such as salary, taxes, benefits, and insurance.',
  securityDeposit:
    'A refundable deposit collected from the client to cover payroll or unpaid obligations.',
};

export type EorBillingAmounts = {
  serviceFeeRevenue: number;
  costs: number;
  credit: number;
};

export type EorBillingSummary = EorBillingAmounts & {
  projectCount: number;
};

export type EorBillingTrendPoint = {
  period: string;
  serviceFeeRevenue: number;
  costs: number;
  credit: number;
};

export type EorBillingTableClientRow = {
  key: DemoClientId;
  name: string;
  salesName: string;
  color: string;
  logoUrl: string;
  monthlyAmounts: EorBillingAmounts[];
  values: number[];
  total: number;
};

export type EorBillingTableProjectRow = {
  key: string;
  name: string;
  clientId: DemoClientId;
  monthlyAmounts: EorBillingAmounts[];
  values: number[];
  total: number;
};

const SALES_REP_NAMES: Record<DemoRepKey, string> = {
  alice: 'Alice Chen',
  bob: 'Bob Li',
  carol: 'Carol Wang',
  david: 'David Park',
};

function totalOfAmounts(amounts: EorBillingAmounts): number {
  return amounts.serviceFeeRevenue + amounts.costs + amounts.credit;
}

function addAmounts(a: EorBillingAmounts, b: EorBillingAmounts): EorBillingAmounts {
  return {
    serviceFeeRevenue: a.serviceFeeRevenue + b.serviceFeeRevenue,
    costs: a.costs + b.costs,
    credit: a.credit + b.credit,
  };
}

function sliceProjectMonthly(
  project: EorBillingProjectRef,
  params: EorBillingFilterParams,
): EorBillingAmounts[] {
  const result: EorBillingAmounts[] = [];
  for (let monthIndex = params.rangeStartIdx; monthIndex <= params.rangeEndIdx; monthIndex++) {
    result.push(
      project.monthly[monthIndex] ?? { serviceFeeRevenue: 0, costs: 0, credit: 0 },
    );
  }
  return result;
}

export type EorBillingChartRow = {
  key: string;
  label: string;
  owner: DemoRepKey;
  serviceFeeRevenue: number;
  costs: number;
  credit: number;
  total: number;
};

export type EorBillingFilterParams = {
  rangeStartIdx: number;
  rangeEndIdx: number;
  clientIds: readonly DemoClientId[];
  salesKeys: readonly DemoRepKey[];
};

type EorBillingProjectRef = {
  key: string;
  clientId: DemoClientId;
  clientName: string;
  projectName: string;
  owner: DemoRepKey;
  monthly: readonly EorBillingAmounts[];
};

const CLIENT_MONTHLY_BASE = buildClientMonthlyFromReps(
  buildAllRepMonthlySeries(),
  DEMO_MONTH_COUNT,
);

function splitIntoComponents(total: number, projectKey: string): EorBillingAmounts {
  const safeTotal = coerceAmount(total);
  if (safeTotal <= 0) {
    return { serviceFeeRevenue: 0, costs: 0, credit: 0 };
  }

  const seed = [...projectKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const servicePct = 0.64 + (seed % 11) * 0.01;
  const costsPct = 0.2 + (seed % 7) * 0.01;
  const serviceFeeRevenue = Math.round(safeTotal * servicePct);
  const costs = Math.round(safeTotal * costsPct);
  const credit = safeTotal - serviceFeeRevenue - costs;

  return { serviceFeeRevenue, costs, credit };
}

function buildCollectionEorProjects(): EorBillingProjectRef[] {
  const projects: EorBillingProjectRef[] = [];

  for (const group of COLLECTION_CLIENT_GROUPS) {
    const fraction = eorRevenueFraction(group.projects);
    if (fraction <= 0) continue;

    for (const proj of group.projects.filter((p) => p.eor)) {
      const monthly = CLIENT_MONTHLY_BASE[group.filterClientId].map((clientMonth) =>
        splitIntoComponents(Math.round(clientMonth * fraction), proj.key),
      );

      projects.push({
        key: proj.key,
        clientId: group.filterClientId,
        clientName: group.label,
        projectName: proj.name,
        owner: group.owner,
        monthly,
      });
    }
  }

  return projects;
}

function buildNewLogoEorProjects(): EorBillingProjectRef[] {
  const projects: EorBillingProjectRef[] = [];

  for (const client of DEMO_CLIENT_CATALOG) {
    if (!isNewLogoEorDemoClient(client.id)) continue;

    for (const proj of projectsForNewLogoClient(client.id).filter((p) => p.eor)) {
      const monthly = Array.from({ length: DEMO_MONTH_COUNT }, (_, monthIndex) => {
        const [total] = newLogoEorDemoValues(client.id, monthIndex, monthIndex);
        return splitIntoComponents(total ?? 0, proj.key);
      });

      projects.push({
        key: proj.key,
        clientId: client.id,
        clientName: client.name,
        projectName: proj.name,
        owner: client.owner,
        monthly,
      });
    }
  }

  return projects;
}

let cachedProjects: EorBillingProjectRef[] | null = null;

function allEorProjects(): EorBillingProjectRef[] {
  if (!cachedProjects) {
    cachedProjects = [...buildCollectionEorProjects(), ...buildNewLogoEorProjects()];
  }
  return cachedProjects;
}

function filterEorProjects(params: EorBillingFilterParams): EorBillingProjectRef[] {
  const allClients = params.clientIds.length === 0;
  const allSales = params.salesKeys.length === 0;

  return allEorProjects().filter((project) => {
    if (!allClients && !params.clientIds.includes(project.clientId)) return false;
    if (!allSales && !params.salesKeys.includes(project.owner)) return false;
    return true;
  });
}

function sumProjectAmounts(
  project: EorBillingProjectRef,
  rangeStartIdx: number,
  rangeEndIdx: number,
): EorBillingAmounts {
  let serviceFeeRevenue = 0;
  let costs = 0;
  let credit = 0;

  for (let monthIndex = rangeStartIdx; monthIndex <= rangeEndIdx; monthIndex++) {
    const month = project.monthly[monthIndex];
    if (!month) continue;
    serviceFeeRevenue += month.serviceFeeRevenue;
    costs += month.costs;
    credit += month.credit;
  }

  return { serviceFeeRevenue, costs, credit };
}

function toChartRow(
  key: string,
  label: string,
  owner: DemoRepKey,
  amounts: EorBillingAmounts,
): EorBillingChartRow {
  return {
    key,
    label,
    owner,
    serviceFeeRevenue: amounts.serviceFeeRevenue,
    costs: amounts.costs,
    credit: amounts.credit,
    total: amounts.serviceFeeRevenue + amounts.costs + amounts.credit,
  };
}

export function buildEorBillingClientChartRows(params: EorBillingFilterParams): EorBillingChartRow[] {
  const byClient = new Map<
    DemoClientId,
    { label: string; owner: DemoRepKey; amounts: EorBillingAmounts }
  >();

  for (const project of filterEorProjects(params)) {
    const amounts = sumProjectAmounts(project, params.rangeStartIdx, params.rangeEndIdx);
    const total = amounts.serviceFeeRevenue + amounts.costs + amounts.credit;
    if (total <= 0) continue;

    const existing = byClient.get(project.clientId);
    if (!existing) {
      byClient.set(project.clientId, {
        label: project.clientName,
        owner: project.owner,
        amounts: { ...amounts },
      });
      continue;
    }

    existing.amounts.serviceFeeRevenue += amounts.serviceFeeRevenue;
    existing.amounts.costs += amounts.costs;
    existing.amounts.credit += amounts.credit;
  }

  return [...byClient.entries()]
    .map(([clientId, { label, owner, amounts }]) => toChartRow(clientId, label, owner, amounts))
    .sort((a, b) => b.total - a.total);
}

export function buildEorBillingProjectChartRows(
  clientId: DemoClientId,
  params: EorBillingFilterParams,
): EorBillingChartRow[] {
  return filterEorProjects(params)
    .filter((project) => project.clientId === clientId)
    .map((project) => {
      const amounts = sumProjectAmounts(project, params.rangeStartIdx, params.rangeEndIdx);
      return toChartRow(project.key, project.projectName, project.owner, amounts);
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function eorBillingClientLabel(clientId: DemoClientId): string | undefined {
  return allEorProjects().find((project) => project.clientId === clientId)?.clientName;
}

export function buildEorBillingTrendData(params: EorBillingFilterParams): EorBillingTrendPoint[] {
  const projects = filterEorProjects(params);
  const points: EorBillingTrendPoint[] = [];

  for (let monthIndex = params.rangeStartIdx; monthIndex <= params.rangeEndIdx; monthIndex++) {
    let serviceFeeRevenue = 0;
    let costs = 0;
    let credit = 0;

    for (const project of projects) {
      const month = project.monthly[monthIndex];
      if (!month) continue;
      serviceFeeRevenue += month.serviceFeeRevenue;
      costs += month.costs;
      credit += month.credit;
    }

    points.push({
      period: DEMO_PERIOD_LABELS[monthIndex] ?? `M${monthIndex + 1}`,
      serviceFeeRevenue,
      costs,
      credit,
    });
  }

  return points;
}

export function buildEorBillingTableData(params: EorBillingFilterParams): {
  clients: EorBillingTableClientRow[];
  periodTotals: number[];
  grandTotal: number;
} {
  const byClient = new Map<DemoClientId, EorBillingProjectRef[]>();

  for (const project of filterEorProjects(params)) {
    const list = byClient.get(project.clientId) ?? [];
    list.push(project);
    byClient.set(project.clientId, list);
  }

  const periodCount = params.rangeEndIdx - params.rangeStartIdx + 1;
  const clients: EorBillingTableClientRow[] = [];

  for (const [clientId, projects] of byClient) {
    const catalog = DEMO_CLIENT_CATALOG.find((client) => client.id === clientId);
    const monthlyAmounts: EorBillingAmounts[] = Array.from({ length: periodCount }, () => ({
      serviceFeeRevenue: 0,
      costs: 0,
      credit: 0,
    }));

    for (const project of projects) {
      const sliced = sliceProjectMonthly(project, params);
      sliced.forEach((month, index) => {
        monthlyAmounts[index] = addAmounts(monthlyAmounts[index]!, month);
      });
    }

    const values = monthlyAmounts.map(totalOfAmounts);
    const owner = projects[0]?.owner ?? 'alice';

    clients.push({
      key: clientId,
      name: projects[0]?.clientName ?? catalog?.name ?? clientId,
      salesName: SALES_REP_NAMES[owner],
      color: catalog?.color ?? '#8371F3',
      logoUrl: catalog?.logoUrl ?? clientLogoUrl(clientId),
      monthlyAmounts,
      values,
      total: values.reduce((sum, value) => sum + value, 0),
    });
  }

  clients.sort((a, b) => b.total - a.total);

  const periodTotals = Array.from({ length: periodCount }, (_, index) =>
    clients.reduce((sum, client) => sum + (client.values[index] ?? 0), 0),
  );
  const grandTotal = clients.reduce((sum, client) => sum + client.total, 0);

  return { clients, periodTotals, grandTotal };
}

export function projectRowsForEorBillingClient(
  clientId: DemoClientId,
  params: EorBillingFilterParams,
): EorBillingTableProjectRow[] {
  return filterEorProjects(params)
    .filter((project) => project.clientId === clientId)
    .map((project) => {
      const monthlyAmounts = sliceProjectMonthly(project, params);
      const values = monthlyAmounts.map(totalOfAmounts);
      return {
        key: project.key,
        name: project.projectName,
        clientId,
        monthlyAmounts,
        values,
        total: values.reduce((sum, value) => sum + value, 0),
      };
    });
}

export function summarizeEorBilling(params: EorBillingFilterParams): EorBillingSummary {
  const filtered = filterEorProjects(params);

  let serviceFeeRevenue = 0;
  let costs = 0;
  let credit = 0;
  let projectCount = 0;

  for (const project of filtered) {
    const amounts = sumProjectAmounts(project, params.rangeStartIdx, params.rangeEndIdx);

    serviceFeeRevenue += amounts.serviceFeeRevenue;
    costs += amounts.costs;
    credit += amounts.credit;

    if (amounts.serviceFeeRevenue + amounts.costs + amounts.credit > 0) {
      projectCount += 1;
    }
  }

  return { serviceFeeRevenue, costs, credit, projectCount };
}
