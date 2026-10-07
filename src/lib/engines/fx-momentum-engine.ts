import type { StrategyEngine, MarketData, CreateSignalInput } from "./types";
import { ema, rsi } from "../indicators";

const FAST_PERIOD = 20;
const SLOW_PERIOD = 50;
const RSI_PERIOD = 14;
const RSI_LONG_CEILING = 70;
const RSI_SHORT_FLOOR = 30;

// Forex moves in much smaller percentage terms than crypto — these are a
// starting heuristic (same caveat as the crypto engine), not a backtested
// edge. Retune once real closed-trade data exists.
const STOP_PERCENT = 0.4;
const TP_PERCENTS = [0.4, 0.8, 1.3];

export const fxMomentumEngine: StrategyEngine = {
  id: "engine_fx_momentum",
  name: "FX Momentum (EMA20/50 crossover)",
  strategyId: "strategy_fx_momentum",
  market: "forex",
  // Candles (generation) come from Twelve Data, round-robin — one pair
  // every 3 minutes via netlify/functions/generate-signals-fx-cron.mts,
  // which must stay in sync with this list. Live price (tracking) comes
  // from Finnhub for all 10 pairs together — see "FX data architecture"
  // in README.md.
  instruments: [
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
    "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY",
  ],
  timeframe: "30m",

  async generateSignals(data: MarketData): Promise<CreateSignalInput[]> {
    const closes = data.candles.map((c) => c.close);
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

    const stopPct = STOP_PERCENT / 100;
    const tpPcts = TP_PERCENTS.map((p) => p / 100);

    if (crossedUp && Number.isFinite(currentRsi) && currentRsi < RSI_LONG_CEILING) {
      return [
        {
          symbol: data.symbol,
          market: "forex",
          direction: "LONG",
          entry: price,
          stopLoss: price * (1 - stopPct),
          takeProfits: tpPcts.map((p) => price * (1 + p)),
          timeframe: data.timeframe,
          confidence: 62,
          note: `EMA${FAST_PERIOD}/${SLOW_PERIOD} bullish cross, RSI ${currentRsi.toFixed(1)}`,
        },
      ];
    }

    if (crossedDown && Number.isFinite(currentRsi) && currentRsi > RSI_SHORT_FLOOR) {
      return [
        {
          symbol: data.symbol,
          market: "forex",
          direction: "SHORT",
          entry: price,
          stopLoss: price * (1 + stopPct),
          takeProfits: tpPcts.map((p) => price * (1 - p)),
          timeframe: data.timeframe,
          confidence: 62,
          note: `EMA${FAST_PERIOD}/${SLOW_PERIOD} bearish cross, RSI ${currentRsi.toFixed(1)}`,
        },
      ];
    }

    return [];
  },
};
