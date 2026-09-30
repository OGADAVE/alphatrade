import type { Direction, Market, Signal, Timeframe } from "./types";
import { computeRisk } from "./risk-engine";

// Loosely-typed input: this is what an external source (TradingView alert
// JSON, a provider webhook, an admin form) is expected to send BEFORE it
// becomes a trustworthy, normalized Signal. Everything is optional/unknown
// at this stage because validation hasn't run yet.
export interface RawSignalInput {
  symbol?: unknown;
  market?: unknown;
  direction?: unknown;
  entry?: unknown;
  stopLoss?: unknown;
  takeProfits?: unknown; // array of numbers
  timeframe?: unknown;
  confidence?: unknown;
  note?: unknown;
  premiumOnly?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_TIMEFRAMES: Timeframe[] = ["5m", "15m", "30m", "1h", "4h", "1d"];
const VALID_DIRECTIONS: Direction[] = ["LONG", "SHORT"];
const VALID_MARKETS: Market[] = ["crypto", "forex"];

/**
 * Converts a raw, untrusted payload into the standard Signal shape.
 * Does NOT validate — call validateNormalizedSignal() on the result before
 * trusting it. Throws only on payloads too malformed to normalize at all
 * (e.g. non-numeric entry) rather than silently coercing bad data.
 */
export function normalizeSignal(
  raw: RawSignalInput,
  context: { sourceId: string; strategyId: string },
): Signal {
  const symbol = String(raw.symbol ?? "").trim().toUpperCase();
  const market = (String(raw.market ?? "").toLowerCase() as Market) || inferMarket(symbol);
  const direction = String(raw.direction ?? "").toUpperCase() as Direction;
  const entry = toNumber(raw.entry);
  const stopLoss = toNumber(raw.stopLoss);
  const rawTps = Array.isArray(raw.takeProfits) ? raw.takeProfits : [raw.takeProfits];
  const takeProfitPrices = rawTps.map(toNumber).filter((n): n is number => n !== null);
  const timeframe = (String(raw.timeframe ?? "15m").toLowerCase() as Timeframe) || "15m";
  const confidence = clamp(toNumber(raw.confidence) ?? 60, 1, 100);

  const { riskScore, riskLevel } = computeRisk({
    direction,
    entry: entry ?? 0,
    stopLoss: stopLoss ?? 0,
    takeProfits: takeProfitPrices,
    confidence,
  });

  const now = new Date().toISOString();

  return {
    id: "", // assigned by Firestore on write
    symbol,
    market,
    direction,
    entry: entry ?? 0,
    stopLoss: stopLoss ?? 0,
    takeProfits: takeProfitPrices.map((price, i) => ({
      level: (i + 1) as 1 | 2 | 3,
      price,
      hitAt: null,
    })),
    timeframe,
    sourceId: context.sourceId,
    strategyId: context.strategyId,
    confidence,
    riskScore,
    riskLevel,
    premiumOnly: Boolean(raw.premiumOnly),
    note: typeof raw.note === "string" ? raw.note : undefined,
    status: "ACTIVE",
    createdAt: now,
    activatedAt: now,
  };
}

/** Validates a normalized signal (spec section 9). */
export function validateNormalizedSignal(signal: Signal): ValidationResult {
  const errors: string[] = [];

  if (!signal.symbol || !signal.symbol.includes("/")) {
    errors.push("Symbol is missing or malformed (expected e.g. BTC/USDT).");
  }
  if (!VALID_MARKETS.includes(signal.market)) {
    errors.push(`Market must be one of: ${VALID_MARKETS.join(", ")}.`);
  }
  if (!VALID_DIRECTIONS.includes(signal.direction)) {
    errors.push(`Direction must be one of: ${VALID_DIRECTIONS.join(", ")}.`);
  }
  if (!Number.isFinite(signal.entry) || signal.entry <= 0) {
    errors.push("Entry price must be a positive number.");
  }
  if (!Number.isFinite(signal.stopLoss) || signal.stopLoss <= 0) {
    errors.push("Stop loss must be a positive number.");
  }
  if (signal.takeProfits.length === 0) {
    errors.push("At least one take-profit target is required.");
  }
  if (!VALID_TIMEFRAMES.includes(signal.timeframe)) {
    errors.push(`Timeframe must be one of: ${VALID_TIMEFRAMES.join(", ")}.`);
  }

  // TP/SL logical consistency relative to direction.
  if (Number.isFinite(signal.entry) && Number.isFinite(signal.stopLoss)) {
    if (signal.direction === "LONG" && signal.stopLoss >= signal.entry) {
      errors.push("For a LONG signal, stop loss must be below entry.");
    }
    if (signal.direction === "SHORT" && signal.stopLoss <= signal.entry) {
      errors.push("For a SHORT signal, stop loss must be above entry.");
    }
    for (const tp of signal.takeProfits) {
      if (signal.direction === "LONG" && tp.price <= signal.entry) {
        errors.push(`TP${tp.level} must be above entry for a LONG signal.`);
      }
      if (signal.direction === "SHORT" && tp.price >= signal.entry) {
        errors.push(`TP${tp.level} must be below entry for a SHORT signal.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Duplicate detection (spec section 10): rejects a candidate if an
 * already-open signal exists for the same source, symbol, direction, and
 * entry price (within a small tolerance) — the classic "provider sent the
 * same alert twice" case.
 */
export function isDuplicateSignal(candidate: Signal, openSignals: Signal[]): boolean {
  const TOLERANCE = 0.0005; // 0.05% price tolerance
  return openSignals.some((existing) => {
    if (existing.sourceId !== candidate.sourceId) return false;
    if (existing.symbol !== candidate.symbol) return false;
    if (existing.direction !== candidate.direction) return false;
    const diff = Math.abs(existing.entry - candidate.entry) / candidate.entry;
    return diff <= TOLERANCE;
  });
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function inferMarket(symbol: string): Market {
  return /USDT|BTC|ETH|BNB|SOL|XRP/.test(symbol) ? "crypto" : "forex";
}
