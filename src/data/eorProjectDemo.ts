import type { CollectionProjectDef } from './collectionClientDemo';
import { clientHasEorProject, COLLECTION_CLIENT_GROUPS } from './collectionClientDemo';
import type { DemoClientId } from './demoClientCatalog';
import { coerceAmount } from '../utils/moneyFormat';

export type EorWeightedProject = { weight: number; eor?: boolean };

/** Share of client / rep revenue attributed to EOR-tagged projects (0–1). */
export function eorRevenueFraction(projects: readonly EorWeightedProject[]): number {
  const total = projects.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) return 0;
  const eor = projects.filter((p) => p.eor).reduce((sum, p) => sum + p.weight, 0);
  return eor / total;
}

export function eorRevenueFractionForClient(clientId: DemoClientId): number {
  if (!clientHasEorProject(clientId)) return 0;
  const group = COLLECTION_CLIENT_GROUPS.find((g) => g.filterClientId === clientId);
  if (!group) return 0;
  return eorRevenueFraction(group.projects);
}

export function isClientInEorScope(clientId: DemoClientId): boolean {
  return clientHasEorProject(clientId);
}

export function eorProjectsForClient(clientId: DemoClientId): CollectionProjectDef[] {
  const group = COLLECTION_CLIENT_GROUPS.find((g) => g.filterClientId === clientId);
  if (!group) return [];
  return group.projects.filter((p) => p.eor);
}

export function scaleAmountForEor(amount: number, fraction: number): number {
  if (fraction >= 1) return coerceAmount(amount);
  if (fraction <= 0) return 0;
  return Math.round(coerceAmount(amount) * fraction);
}

export function scaleSeriesForEor(values: readonly number[], fraction: number): number[] {
  if (fraction >= 1) return values.map(coerceAmount);
  if (fraction <= 0) return values.map(() => 0);
  return values.map((v) => scaleAmountForEor(v, fraction));
}

export function projectsForRevenueScope<T extends EorWeightedProject>(
  projects: readonly T[],
  eorOnly: boolean,
): T[] {
  if (!eorOnly) return [...projects];
  return projects.filter((p) => p.eor);
}

/** Rep-level demo project lines (must stay in sync with SalesRevenueAnalyticsPage REP_PROJECT_SPLITS). */
const REP_SPLIT_EOR_BY_PROJECT_NAME = new Set([
  'Northwind SaaS',
  'Contoso Analytics',
  'Fabrikam Support',
  'Tailspin IoT',
]);

/** Whether a breakdown / new-logo project row should show the EOR badge. */
export function isEorProjectName(projectName: string, clientId?: DemoClientId): boolean {
  if (clientId) {
    const group = COLLECTION_CLIENT_GROUPS.find((g) => g.filterClientId === clientId);
    const match = group?.projects.find((p) => p.name === projectName);
    if (match) return Boolean(match.eor);
  }

  for (const group of COLLECTION_CLIENT_GROUPS) {
    const match = group.projects.find((p) => p.name === projectName);
    if (match) return Boolean(match.eor);
  }

  return REP_SPLIT_EOR_BY_PROJECT_NAME.has(projectName);
}
