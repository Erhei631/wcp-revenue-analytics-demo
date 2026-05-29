import { feeProfileForClientId, type FeeAmountProfile } from './accountFeeProfiles';
import { DEMO_CLIENT_CATALOG, type DemoClientId } from './demoClientCatalog';
import type { DemoRepKey } from './analyticsDemoSeries';

export type CollectionProjectDef = {
  key: string;
  name: string;
  weight: number;
  /** Matches Billing Dashboard project EOR tag — used for Revenue Analytics EOR filter. */
  eor?: boolean;
};

export type CollectionClientGroup = {
  key: string;
  label: string;
  owner: DemoRepKey;
  filterClientId: DemoClientId;
  equity: number;
  paid: number;
  unpaid: number;
  projects: CollectionProjectDef[];
};

function scaleFeeProfile(profile: FeeAmountProfile, scale: number): FeeAmountProfile {
  return {
    equity: Math.round(profile.equity * scale),
    paid: Math.round(profile.paid * scale),
    unpaid: Math.round(profile.unpaid * scale),
  };
}

/** Deterministic fee mix per catalog client (20 bars in Account Overview). */
function feeForClient(clientId: DemoClientId, index: number): FeeAmountProfile {
  const base = feeProfileForClientId(clientId);
  const scale = 0.7 + (index % 6) * 0.055 + ((index * 7) % 5) * 0.02;
  return scaleFeeProfile(base, scale);
}

/** Demo: only these catalog clients have an EOR-tagged sub-project (Implementation). */
export const CLIENTS_WITH_EOR_PROJECT = new Set<DemoClientId>([
  'acme',
  'globex',
  'initech',
  'umbrella',
  'harbor',
]);

export function clientHasEorProject(clientId: DemoClientId): boolean {
  return CLIENTS_WITH_EOR_PROJECT.has(clientId);
}

function buildProjects(clientId: DemoClientId, displayName: string): CollectionProjectDef[] {
  const primary =
    displayName.includes('·') ? displayName.split('·').slice(1).join('·').trim() : displayName;
  const hasEor = clientHasEorProject(clientId);

  return [
    { key: `${clientId}-p1`, name: primary, weight: 0.34 },
    { key: `${clientId}-p2`, name: 'Implementation', weight: 0.26, eor: hasEor },
    { key: `${clientId}-p3`, name: 'Support retainer', weight: 0.22 },
    { key: `${clientId}-p4`, name: 'Change requests', weight: 0.18 },
  ];
}

/** Twenty clients — aligned with Revenue by client rank list. */
export const COLLECTION_CLIENT_GROUPS: CollectionClientGroup[] = DEMO_CLIENT_CATALOG.map((client, index) => {
  const fee = feeForClient(client.id, index);
  return {
    key: client.id,
    label: client.name,
    owner: client.owner,
    filterClientId: client.id,
    equity: fee.equity,
    paid: fee.paid,
    unpaid: fee.unpaid,
    projects: buildProjects(client.id, client.name),
  };
});
