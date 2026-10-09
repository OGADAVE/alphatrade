export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Flat 4-decimal-place rule, platform-wide — a deliberate choice for
// consistency over per-market/per-symbol precision (an earlier version of
// this varied by market: 5dp forex/3dp JPY/2dp crypto). Note the one real
// trade-off: a large-magnitude crypto price (e.g. BTC/USDT ~103500) will
// display as "103500.0000" rather than "103500.00" — trailing zeros are
// expected there, not a bug.
const DISPLAY_DECIMALS = 4;

/** Rounds a price to the platform's display precision — call this where a price is PRODUCED, not just displayed. */
export function roundPrice(price: number): number {
  return roundTo(price, DISPLAY_DECIMALS);
}

export function formatPrice(price: number): string {
  return roundPrice(price).toFixed(DISPLAY_DECIMALS);
}

export function formatPercent(value: number, decimals = 2): string {
  const rounded = roundTo(value, decimals);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(decimals)}%`;
}

export function formatR(value: number, decimals = 2): string {
  const rounded = roundTo(value, decimals);
  const sign = rounded >= 0 ? "+" : "";
  return `${sign}${rounded.toFixed(decimals)}R`;
}