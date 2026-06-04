/** Treat missing/invalid amounts as 0 for sums and charts. */
export function coerceAmount(value: number | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/** Table / metric display: no data or zero → "-", otherwise currency. */
export function formatMoney(value: number | null | undefined): string {
  const amount = coerceAmount(value);
  if (amount === 0) return '-';
  return `$${amount.toLocaleString('en-US')}`;
}

/** Always show currency (used in tooltips and narrative copy). */
export function formatMoneyValue(value: number | null | undefined): string {
  return `$${coerceAmount(value).toLocaleString('en-US')}`;
}

/** Compact currency for breakdown sub-rows (e.g. $1.6k). */
export function moneyShort(value: number | null | undefined): string {
  const abs = Math.abs(coerceAmount(value));
  if (abs >= 1000) {
    const k = Math.round((abs / 1000) * 10) / 10;
    const formatted = Number.isInteger(k) ? String(k) : k.toFixed(1);
    return `$${formatted}k`;
  }
  return `$${abs.toLocaleString('en-US')}`;
}
