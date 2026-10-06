import type { Market } from "./types";

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Decimal places for a price, by market convention — not whatever
 * JavaScript's floating-point math happens to produce. Forex follows
 * standard pip convention (5dp, or 3dp for JPY pairs, since JPY pairs are
 * quoted two orders of magnitude differently). Crypto scales to the
 * price's own magnitude so a sub-$1 token and a $100k coin both read
 * sensibly without a per-symbol lookup table.
 */
export function priceDecimals(market: Market, symbol: string, price: number): number {
  if (market === "forex") return symbol.toUpperCase().includes("JPY") ? 3 : 5;
  return price < 1 ? 6 : 2;
}

/** Rounds a price to its market's display precision — call this where a price is PRODUCED, not just displayed. */
export function roundPrice(price: number, market: Market, symbol: string): number {
  return roundTo(price, priceDecimals(market, symbol, price));
}

export function formatPrice(price: number, market: Market, symbol: string): string {
  return roundPrice(price, market, symbol).toFixed(priceDecimals(market, symbol, price));
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
