import "server-only";
import type { Candle } from "./engines/types";
import type { Market, Timeframe } from "./types";

// Abstracted so the exchange/data provider can change without rewriting
// the tracking engine (spec section 30). Add a new provider by adding a
// branch in getCurrentPrice()/getCandles() and a fetch function beside the
// ones here.

/** "BTC/USDT" -> "BTCUSDT" */
function toBinanceSymbol(symbol: string): string {
  return symbol.replace("/", "").toUpperCase();
}

async function getCryptoPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${toBinanceSymbol(symbol)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: string };
    const price = data.price ? Number(data.price) : null;
    return price && Number.isFinite(price) ? price : null;
  } catch (err) {
    console.error(`Binance price fetch failed for ${symbol}:`, err);
    return null;
  }
}

async function getForexPrice(symbol: string): Promise<number | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.warn(`No TWELVE_DATA_API_KEY configured — skipping forex price for ${symbol}.`);
    return null;
  }
  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: string };
    const price = data.price ? Number(data.price) : null;
    return price && Number.isFinite(price) ? price : null;
  } catch (err) {
    console.error(`Twelve Data price fetch failed for ${symbol}:`, err);
    return null;
  }
}

export async function getCurrentPrice(symbol: string, market: "crypto" | "forex"): Promise<number | null> {
  return market === "crypto" ? getCryptoPrice(symbol) : getForexPrice(symbol);
}

/** Fetch prices for a batch of unique (symbol, market) pairs, one call each. */
export async function getCurrentPrices(
  pairs: { symbol: string; market: "crypto" | "forex" }[],
): Promise<Map<string, number | null>> {
  const results = await Promise.all(
    pairs.map(async (p) => [`${p.market}:${p.symbol}`, await getCurrentPrice(p.symbol, p.market)] as const),
  );
  return new Map(results);
}

// Our Timeframe values ("5m", "15m", ...) already match Binance's own
// interval strings, so no mapping is needed for crypto.
async function getCryptoCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${toBinanceSymbol(symbol)}&interval=${timeframe}&limit=${limit}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const raw = (await res.json()) as unknown[][];
    return raw.map((k) => ({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
  } catch (err) {
    console.error(`Binance candle fetch failed for ${symbol}:`, err);
    return [];
  }
}

const TWELVE_DATA_INTERVAL: Record<Timeframe, string> = {
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

async function getForexCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.warn(`No TWELVE_DATA_API_KEY configured — skipping forex candles for ${symbol}.`);
    return [];
  }
  try {
    const interval = TWELVE_DATA_INTERVAL[timeframe];
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${limit}&apikey=${apiKey}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { values?: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }[] };
    if (!data.values) return [];
    // Twelve Data returns most-recent-first; reverse to oldest-first.
    return data.values
      .map((v) => ({
        time: new Date(v.datetime).getTime(),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: v.volume ? Number(v.volume) : 0,
      }))
      .reverse();
  } catch (err) {
    console.error(`Twelve Data candle fetch failed for ${symbol}:`, err);
    return [];
  }
}

export async function getCandles(symbol: string, market: Market, timeframe: Timeframe, limit = 150): Promise<Candle[]> {
  return market === "crypto" ? getCryptoCandles(symbol, timeframe, limit) : getForexCandles(symbol, timeframe, limit);
}
