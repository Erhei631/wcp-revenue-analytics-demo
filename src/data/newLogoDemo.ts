import type { CollectionProjectDef } from './collectionClientDemo';
import { DEMO_CLIENT_CATALOG, type DemoClientId } from './demoClientCatalog';

/** Demo month index (into DEMO_MONTHS) when the client logo was first won. */
export const NEW_LOGO_START_MONTH_INDEX: Partial<Record<DemoClientId, number>> = {
  apex: 4,
  harbor: 5,
  flint: 7,
  bolt: 9,
  jade: 10,
  core: 11,
  dusk: 13,
  nova: 15,
  orbit: 16,
  prism: 16,
};

/** New logos with a placeholder sub-project; parent and project amounts stay zero. */
export const NEW_LOGO_ZERO_REVENUE_CLIENT_IDS = new Set<DemoClientId>(['nova']);

/** Shown in New Logos when the EOR filter is on (demo). */
export const NEW_LOGO_EOR_DEMO_CLIENT_IDS = new Set<DemoClientId>(['dusk', 'orbit']);

/**
 * EOR-only monthly revenue by global DEMO_MONTHS index (Jan 2025 = 0).
 * Values are non-zero only after the client’s logo start month.
 */
const NEW_LOGO_EOR_DEMO_BY_MONTH: Partial<Record<DemoClientId, readonly number[]>> = {
  dusk: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 420, 680, 540, 610,
  ],
  orbit: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 980, 1_180,
  ],
};

export function isNewLogoEorDemoClient(clientId: DemoClientId): boolean {
  return NEW_LOGO_EOR_DEMO_CLIENT_IDS.has(clientId);
}

export function newLogoEorDemoValues(
  clientId: DemoClientId,
  rangeStartIdx: number,
  rangeEndIdx: number,
): number[] {
  const series = NEW_LOGO_EOR_DEMO_BY_MONTH[clientId];
  if (!series) return [];
  return series.slice(rangeStartIdx, rangeEndIdx + 1).map((v) => v ?? 0);
}

export function isNewLogoClientZeroRevenue(clientId: DemoClientId): boolean {
  return NEW_LOGO_ZERO_REVENUE_CLIENT_IDS.has(clientId);
}

export function isNewLogoClientInRange(
  clientId: DemoClientId,
  rangeStartIdx: number,
  rangeEndIdx: number,
): boolean {
  const start = NEW_LOGO_START_MONTH_INDEX[clientId];
  if (start === undefined) return false;
  return start >= rangeStartIdx && start <= rangeEndIdx;
}

function primaryProjectLabel(displayName: string) {
  return displayName.includes('·') ? displayName.split('·').slice(1).join('·').trim() : displayName;
}

/** New-logo clients typically have one or two active projects (not the full four-project mix). */
const NEW_LOGO_TWO_PROJECT_CLIENTS = new Set<DemoClientId>([
  'apex',
  'dusk',
  'core',
  'bolt',
  'harbor',
  'orbit',
]);

function buildNewLogoProjects(clientId: DemoClientId): CollectionProjectDef[] {
  const client = DEMO_CLIENT_CATALOG.find((c) => c.id === clientId);
  if (!client) return [];

  const primary = primaryProjectLabel(client.name);
  if (!NEW_LOGO_TWO_PROJECT_CLIENTS.has(clientId)) {
    return [{ key: `${clientId}-p1`, name: primary, weight: 1 }];
  }

  return [
    { key: `${clientId}-p1`, name: primary, weight: 0.65 },
    { key: `${clientId}-p2`, name: 'Implementation', weight: 0.35, eor: true },
  ];
}

export function projectsForNewLogoClient(clientId: DemoClientId): CollectionProjectDef[] {
  return buildNewLogoProjects(clientId);
}

type WeightedProject = { name: string; weight: number };

function splitAmountByProjects(
  amount: number,
  projects: readonly WeightedProject[],
): { project: string; revenue: number }[] {
  if (amount <= 0) {
    return projects.map((p) => ({ project: p.name, revenue: 0 }));
  }
  const totalWeight = projects.reduce((s, p) => s + p.weight, 0);
  let remaining = amount;
  return projects.map((p, i) => {
    if (i === projects.length - 1) {
      return { project: p.name, revenue: remaining };
    }
    const share = Math.round((amount * p.weight) / totalWeight);
    remaining -= share;
    return { project: p.name, revenue: share };
  });
}

export function projectRevenueLinesForMonth(
  amount: number,
  clientId: DemoClientId,
): { project: string; revenue: number }[] {
  const defs = projectsForNewLogoClient(clientId);
  if (defs.length === 0) return [];
  return splitAmountByProjects(
    amount,
    defs.map((p) => ({ name: p.name, weight: p.weight })),
  );
}

export type NewLogoProjectRow = {
  key: string;
  name: string;
  values: number[];
  total: number;
  clientId: DemoClientId;
  eor?: boolean;
};

export function projectRowsForNewLogoClient(
  clientId: DemoClientId,
  values: number[],
): NewLogoProjectRow[] {
  const defs = projectsForNewLogoClient(clientId);
  if (defs.length === 0) return [];

  return defs.map((proj) => {
    const childValues = values.map((amount) => {
      const lines = projectRevenueLinesForMonth(amount, clientId);
      return lines.find((line) => line.project === proj.name)?.revenue ?? 0;
    });
    return {
      key: `${clientId}::${proj.key}`,
      name: proj.name,
      values: childValues,
      total: childValues.reduce((sum, value) => sum + value, 0),
      clientId,
      eor: proj.eor,
    };
  });
}
