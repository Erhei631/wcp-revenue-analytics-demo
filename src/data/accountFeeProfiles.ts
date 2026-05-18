import type { DemoClientId } from './demoClientCatalog';

export type AnalyticsClientId = 'acme' | 'globex' | 'initech' | 'umbrella';

const TOOLBAR_FEE_CLIENT_IDS = new Set<AnalyticsClientId>(['acme', 'globex', 'initech', 'umbrella']);

export function isToolbarFeeClient(id: DemoClientId): id is AnalyticsClientId {
  return TOOLBAR_FEE_CLIENT_IDS.has(id as AnalyticsClientId);
}

export function feeProfileForClientId(clientId?: DemoClientId | null): FeeAmountProfile {
  if (clientId && isToolbarFeeClient(clientId)) {
    return FEE_PROFILE_BY_CLIENT[clientId];
  }
  return DEFAULT_FEE_PROFILE;
}

export type FeeAmountProfile = {
  equity: number;
  paid: number;
  unpaid: number;
};

export type ServiceFeeBreakdown = {
  serviceFeeTotal: number;
  equity: number;
  cash: number;
  paid: number;
  unpaid: number;
};

/** Demo fee mix per toolbar client (matches Account Overview chart). */
export const FEE_PROFILE_BY_CLIENT: Record<AnalyticsClientId, FeeAmountProfile> = {
  acme: { equity: 45_000, paid: 132_000, unpaid: 26_000 },
  globex: { equity: 28_000, paid: 84_000, unpaid: 8_000 },
  initech: { equity: 40_000, paid: 112_000, unpaid: 23_000 },
  umbrella: { equity: 24_000, paid: 68_000, unpaid: 12_000 },
};

/** Fallback mix for secondary projects without a dedicated client id. */
export const DEFAULT_FEE_PROFILE: FeeAmountProfile = {
  equity: 28_000,
  paid: 84_000,
  unpaid: 12_000,
};

export function blendFeeProfiles(profiles: FeeAmountProfile[]): FeeAmountProfile {
  return profiles.reduce(
    (acc, profile) => ({
      equity: acc.equity + profile.equity,
      paid: acc.paid + profile.paid,
      unpaid: acc.unpaid + profile.unpaid,
    }),
    { equity: 0, paid: 0, unpaid: 0 },
  );
}

export function cashPaidFromServiceFeeTotal(
  serviceFeeTotal: number,
  profile: FeeAmountProfile = DEFAULT_FEE_PROFILE,
): number {
  return splitServiceFeeTotal(serviceFeeTotal, profile).paid;
}

export function splitServiceFeeTotal(
  serviceFeeTotal: number,
  profile: FeeAmountProfile = DEFAULT_FEE_PROFILE,
): ServiceFeeBreakdown {
  if (serviceFeeTotal <= 0) {
    return { serviceFeeTotal: 0, equity: 0, cash: 0, paid: 0, unpaid: 0 };
  }

  const base = profile.equity + profile.paid + profile.unpaid;
  const equity = Math.round(serviceFeeTotal * (profile.equity / base));
  const cash = serviceFeeTotal - equity;
  const cashBase = profile.paid + profile.unpaid;
  const paid = cashBase > 0 ? Math.round(cash * (profile.paid / cashBase)) : 0;
  const unpaid = cash - paid;

  return { serviceFeeTotal, equity, cash, paid, unpaid };
}
