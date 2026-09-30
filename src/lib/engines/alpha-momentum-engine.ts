import type { StrategyEngine, MarketData, CreateSignalInput } from "./types";
import { ema, rsi } from "../indicators";

const FAST_PERIOD = 20;
const SLOW_PERIOD = 50;
const RSI_PERIOD = 14;
const RSI_LONG_CEILING = 70; // don't go long into overbought
const RSI_SHORT_FLOOR = 30; // don't go short into oversold

// Simple percentage-based stop/targets — a starting point so the pipeline
// has something concrete to validate/track/score end-to-end. Swap for an
// ATR-based or structure-based model once real closed-trade data exists to
// tune against; don't mistake these numbers for a backtested edge.
const STOP_PERCENT: Record<string, number> = { crypto: 1.5, forex: 0.4 };
const TP_PERCENTS: Record<string, number[]> = {
  crypto: [1.5, 3, 5],
  forex: [0.4, 0.8, 1.3],
};

export const alphaMomentumEngine: StrategyEngine = {
  id: "engine_alpha_momentum",
  name: "Alpha Momentum (EMA20/50 crossover)",
  strategyId: "strategy_alpha_momentum",
  market: "crypto",
  instruments: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
  timeframe: "15m",

  async generateSignals(data: MarketData): Promise<CreateSignalInput[]> {
    const closes = data.candles.map((c) => c.close);
    // Need enough history for the slow EMA plus one prior bar to detect a
    // fresh cross (as opposed to "currently above", which stays true for
    // many bars and would otherwise re-signal every run).
    if (closes.length < SLOW_PERIOD + 2) return [];

    const emaFast = ema(closes, FAST_PERIOD);
    const emaSlow = ema(closes, SLOW_PERIOD);
    const rsiValues = rsi(closes, RSI_PERIOD);

    const last = closes.length - 1;
    const prev = last - 1;
    const currentRsi = rsiValues[last];
    const price = closes[last];

    const crossedUp = emaFast[prev] <= emaSlow[prev] && emaFast[last] > emaSlow[last];
    const crossedDown = emaFast[prev] >= emaSlow[prev] && emaFast[last] < emaSlow[last];

    const stopPct = (STOP_PERCENT[data.market] ?? 1.5) / 100;
    const tpPcts = (TP_PERCENTS[data.market] ?? [1.5, 3, 5]).map((p) => p / 100);

    if (crossedUp && Number.isFinite(currentRsi) && currentRsi < RSI_LONG_CEILING) {
      return [
        {
          symbol: data.symbol,
          market: data.market,
          direction: "LONG",
          entry: price,
          stopLoss: price * (1 - stopPct),
          takeProfits: tpPcts.map((p) => price * (1 + p)),
          timeframe: data.timeframe,
          confidence: 65,
          note: `EMA${FAST_PERIOD}/${SLOW_PERIOD} bullish cross, RSI ${currentRsi.toFixed(1)}`,
        },
      ];
    }

    if (crossedDown && Number.isFinite(currentRsi) && currentRsi > RSI_SHORT_FLOOR) {
      return [
        {
          symbol: data.symbol,
          market: data.market,
          direction: "SHORT",
          entry: price,
          stopLoss: price * (1 + stopPct),
          takeProfits: tpPcts.map((p) => price * (1 - p)),
          timeframe: data.timeframe,
          confidence: 65,
          note: `EMA${FAST_PERIOD}/${SLOW_PERIOD} bearish cross, RSI ${currentRsi.toFixed(1)}`,
        },
      ];
    }

    return [];
  },
};
