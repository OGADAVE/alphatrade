import type { Direction, Market, Timeframe } from "../types";

export interface Candle {
  time: number; // unix ms, candle open time
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  market: Market;
  timeframe: Timeframe;
  candles: Candle[]; // oldest first
}

/**
 * What an engine hands back to AlphaTrade for a candidate signal — plain
 * numbers, no source-specific noise. This flows straight into the same
 * normalizeSignal()/validateNormalizedSignal() pipeline that webhook
 * payloads go through (src/lib/signal-pipeline.ts): an engine's output and
 * an external provider's JSON are treated identically past this point.
 */
export interface CreateSignalInput {
  symbol: string;
  market: Market;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  timeframe: Timeframe;
  confidence: number;
  note?: string;
}

/**
 * The adapter interface itself. AlphaTrade's ingestion, tracking, and
 * scoring layers never call an engine directly — a scheduler (see
 * src/app/api/cron/generate-signals) does, then hands the output to the
 * standard pipeline. Adding a new source (LEAN, a different custom
 * strategy, eventually Jesse if it's ever worth the infra) means writing
 * one of these and registering it — nothing else in the app changes.
 */
export interface StrategyEngine {
  /** Matches a signal_sources Firestore doc id. */
  id: string;
  name: string;
  /** Which strategy's performance/AlphaScore this engine's signals roll up into. */
  strategyId: string;
  market: Market;
  instruments: string[]; // symbols this engine evaluates, e.g. ["BTC/USDT"]
  timeframe: Timeframe;
  generateSignals(data: MarketData): Promise<CreateSignalInput[]>;
}
