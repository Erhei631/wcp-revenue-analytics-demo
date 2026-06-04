/** Shared outer grid for analytics revenue / new-logos tables (header, parent, expanded). */
export const REVENUE_SALES_REP_COL_WIDTH = 300;
export const REVENUE_PROJECT_NAME_COL_WIDTH = 180;
export const REVENUE_METRIC_LABEL_COL_WIDTH = 120;
export const REVENUE_PERIOD_COL_MIN_WIDTH = 160;
export const REVENUE_GRAND_TOTAL_COL_WIDTH = 200;
export const REVENUE_PROJECT_NAME_INDENT = 48;

/** @deprecated Use REVENUE_SALES_REP_COL_WIDTH */
export const REVENUE_CLIENT_NAME_AREA_WIDTH = REVENUE_SALES_REP_COL_WIDTH;

export function revenueTableScrollWidth(periodCount: number) {
  return (
    REVENUE_SALES_REP_COL_WIDTH +
    periodCount * REVENUE_PERIOD_COL_MIN_WIDTH +
    REVENUE_GRAND_TOTAL_COL_WIDTH
  );
}

/** EOR Breakdown: shared first-column width (header, parent row, expanded row). */
export const EOR_BILLING_CLIENT_NAME_COL_WIDTH = 330;
export const EOR_BILLING_PROJECT_INFO_WIDTH = 200;
export const EOR_BILLING_METRIC_LABEL_COL_WIDTH = 130;

/** @deprecated Use EOR_BILLING_CLIENT_NAME_COL_WIDTH */
export const EOR_BILLING_CLIENT_NAME_AREA_WIDTH = EOR_BILLING_CLIENT_NAME_COL_WIDTH;
/** @deprecated Use EOR_BILLING_PROJECT_INFO_WIDTH */
export const EOR_BILLING_PROJECT_NAME_COL_WIDTH = EOR_BILLING_PROJECT_INFO_WIDTH;
export const EOR_BILLING_PERIOD_COL_MIN_WIDTH = 150;

export function eorBillingTableScrollWidth(periodCount: number) {
  return (
    EOR_BILLING_CLIENT_NAME_COL_WIDTH +
    periodCount * EOR_BILLING_PERIOD_COL_MIN_WIDTH +
    REVENUE_GRAND_TOTAL_COL_WIDTH
  );
}

/** Outer expanded-row grid for EOR Breakdown (uses --client-name-col-width on table). */
export function eorBillingTableOuterGridColumns(periodCount: number) {
  return `var(--client-name-col-width) repeat(${periodCount}, minmax(var(--period-col-min), 1fr)) minmax(var(--grand-total-min), var(--grand-total-max))`;
}

/** Outer expanded-row grid; period count is the only variable input. */
export function revenueTableOuterGridColumns(periodCount: number) {
  return `var(--client-name-col-width) repeat(${periodCount}, minmax(var(--period-col-min), 1fr)) minmax(var(--grand-total-min), var(--grand-total-max))`;
}
