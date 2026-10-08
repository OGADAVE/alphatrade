import "server-only";
import type { Candle } from "./engines/types";
import type { Market, Timeframe } from "./types";

function toBinanceSymbol(symbol: string): string {
  return symbol.replace("/", "").toUpperCase();
}

const BINANCE_API_BASES = [
  "https://data-api.binance.vision",
  "https://api-gcp.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
  "https://api.binance.com",
];

async function fetchJson(
  url: string,
): Promise<{
  ok: boolean;
  status: number;
  data: unknown;
  body: string;
}> {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.text();

  let data: unknown = null;

  try {
    data = JSON.parse(body);
  } catch {
    data = body;
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    body,
  };
}

async function getCryptoPrice(symbol: string): Promise<number | null> {
  const query = `/api/v3/ticker/price?symbol=${encodeURIComponent(
    toBinanceSymbol(symbol),
  )}`;

  let lastError = "unknown Binance error";

  for (const base of BINANCE_API_BASES) {
    try {
      const result = await fetchJson(`${base}${query}`);

      if (!result.ok) {
        lastError = `${base} returned HTTP ${result.status}: ${result.body.slice(
          0,
          300,
        )}`;
        continue;
      }

      const data = result.data as { price?: string };

      const price = data.price ? Number(data.price) : null;

      if (price && Number.isFinite(price)) {
        return price;
      }

      lastError = `${base} returned no valid price: ${result.body.slice(
        0,
        300,
      )}`;
    } catch (err) {
      lastError = `${base}: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  console.error(`Binance price fetch failed for ${symbol}: ${lastError}`);

  return null;
}

function toFinnhubSymbol(symbol: string): string {
  return `OANDA:${symbol.replace("/", "_").toUpperCase()}`;
}

async function getForexPrice(symbol: string): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    console.warn(
      `No FINNHUB_API_KEY configured — skipping forex price for ${symbol}.`,
    );
    return null;
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        toFinnhubSymbol(symbol),
      )}&token=${apiKey}`,
      { cache: "no-store" },
    );

    const body = await res.text();

    if (!res.ok) {
      console.error(
        `Finnhub price HTTP ${res.status} for ${symbol}: ${body.slice(
          0,
          300,
        )}`,
      );
      return null;
    }

    const data = JSON.parse(body) as { c?: number };

    return typeof data.c === "number" &&
      Number.isFinite(data.c) &&
      data.c > 0
      ? data.c
      : null;
  } catch (err) {
    console.error(`Finnhub price fetch failed for ${symbol}:`, err);
    return null;
  }
}

export async function getCurrentPrice(
  symbol: string,
  market: "crypto" | "forex",
): Promise<number | null> {
  return market === "crypto"
    ? getCryptoPrice(symbol)
    : getForexPrice(symbol);
}

export async function getCurrentPrices(
  pairs: { symbol: string; market: "crypto" | "forex" }[],
): Promise<Map<string, number | null>> {
  const results = await Promise.all(
    pairs.map(
      async (p) =>
        [
          `${p.market}:${p.symbol}`,
          await getCurrentPrice(p.symbol, p.market),
        ] as const,
    ),
  );

  return new Map(results);
}

async function getCryptoCandles(
  symbol: string,
  timeframe: Timeframe,
  limit: number,
): Promise<Candle[]> {
  const query = `/api/v3/klines?symbol=${encodeURIComponent(
    toBinanceSymbol(symbol),
  )}&interval=${encodeURIComponent(timeframe)}&limit=${limit}`;

  const errors: string[] = [];

  for (const base of BINANCE_API_BASES) {
    try {
      const result = await fetchJson(`${base}${query}`);

      if (!result.ok) {
        errors.push(
          `${base}: HTTP ${result.status} ${result.body.slice(0, 200)}`,
        );
        continue;
      }

      if (!Array.isArray(result.data)) {
        errors.push(
          `${base}: unexpected response ${result.body.slice(0, 300)}`,
        );
        continue;
      }

      const raw = result.data as unknown[][];

      const candles = raw
        .map((k) => ({
          time: Number(k[0]),
          open: Number(k[1]),
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
          volume: Number(k[5]),
        }))
        .filter((k) =>
          [
            k.time,
            k.open,
            k.high,
            k.low,
            k.close,
            k.volume,
          ].every(Number.isFinite),
        );

      if (candles.length > 0) {
        return candles;
      }

      errors.push(`${base}: empty kline response`);
    } catch (err) {
      errors.push(
        `${base}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  throw new Error(
    `Binance candle providers failed for ${symbol}: ${errors.join(" | ")}`,
  );
}

const TWELVE_DATA_INTERVAL: Record<Timeframe, string> = {
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

async function getForexCandles(
  symbol: string,
  timeframe: Timeframe,
  limit: number,
): Promise<Candle[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      `TWELVE_DATA_API_KEY is not configured for ${symbol}`,
    );
  }

  const interval = TWELVE_DATA_INTERVAL[timeframe];

  const url = new URL("https://api.twelvedata.com/time_series");

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(limit));
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  try {
    const result = await fetchJson(url.toString());

    const data = result.data as {
      status?: string;
      code?: number;
      message?: string;
      values?: {
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume?: string;
      }[];
    };

    if (!result.ok) {
      throw new Error(
        `Twelve Data HTTP ${result.status}: ${
          data.message ?? result.body.slice(0, 300)
        }`,
      );
    }

    if (data.status === "error" || data.code || !data.values) {
      throw new Error(
        `Twelve Data error for ${symbol}: ${
          data.message ?? result.body.slice(0, 300)
        }`,
      );
    }

    const candles = data.values
      .map((v) => ({
        time: new Date(v.datetime).getTime(),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: v.volume ? Number(v.volume) : 0,
      }))
      .filter((v) =>
        [
          v.time,
          v.open,
          v.high,
          v.low,
          v.close,
          v.volume,
        ].every(Number.isFinite),
      );

    if (candles.length === 0) {
      throw new Error(
        `Twelve Data returned zero valid candles for ${symbol}`,
      );
    }

    return candles;
  } catch (err) {
    console.error(
      `Twelve Data candle fetch failed for ${symbol}:`,
      err,
    );

    throw err;
  }
}

export async function getCandles(
  symbol: string,
  market: Market,
  timeframe: Timeframe,
  limit = 150,
): Promise<Candle[]> {
  return market === "crypto"
    ? getCryptoCandles(symbol, timeframe, limit)
    : getForexCandles(symbol, timeframe, limit);
}