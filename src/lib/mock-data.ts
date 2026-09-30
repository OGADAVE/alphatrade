import type { Signal, Strategy, StrategyPerformance, StrategyPerformanceAggregate } from "./types";
import { computePerformance } from "./alpha-score";

// NOTE: Phase 1 scope is foundation + routing + UI shell (spec section 39).
// This file stands in for live Firestore reads until Phase 2 (signal
// ingestion API) and Phase 4 (tracking engine) are built. Swap these for
// real queries against the `signals` / `strategies` collections then.

export const mockStrategies: Strategy[] = [
  {
    id: "strategy_alpha_momentum",
    name: "Alpha Momentum",
    description: "Trend-following momentum strategy across major crypto pairs.",
    market: "crypto",
    timeframes: ["15m", "1h"],
    instruments: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    engine: "Jesse",
    riskLevel: "medium",
    active: true,
  },
  {
    id: "strategy_fx_momentum",
    name: "FX Momentum",
    description: "Session-based breakout strategy for major forex pairs.",
    market: "forex",
    timeframes: ["30m", "4h"],
    instruments: ["EUR/USD", "GBP/USD", "USD/JPY"],
    engine: "Jesse",
    riskLevel: "medium",
    active: true,
  },
  {
    id: "strategy_breakout",
    name: "Breakout Strategy",
    description: "Range-breakout detection with volume confirmation.",
    market: "crypto",
    timeframes: ["1h", "4h"],
    instruments: ["BTC/USDT", "BNB/USDT"],
    engine: "Jesse",
    riskLevel: "high",
    active: true,
  },
  {
    id: "analyst_chidi_o",
    name: "Chidi O. — Senior Analyst",
    description: "Discretionary swing calls from a human analyst, premium-only.",
    market: "forex",
    timeframes: ["4h", "1d"],
    instruments: ["USD/JPY", "XAU/USD"],
    engine: undefined, // human analyst — no algorithmic engine
    riskLevel: "medium",
    active: true,
  },
];

const mockAggregates: { strategyId: string; activeSignals: number; agg: StrategyPerformanceAggregate }[] = [
  {
    strategyId: "strategy_alpha_momentum",
    activeSignals: 3,
    agg: {
      strategyId: "strategy_alpha_momentum",
      totalSignals: 142,
      wins: 101,
      losses: 41,
      breakevens: 0,
      pnlSum: 340.8, // avg ~2.4%
      pnlSumSq: 1150, // -> modest stddev
      rMultipleSum: 234, // avg ~1.65R
      tp1Hits: 116,
      tp2Hits: 87,
      tp3Hits: 48,
    },
  },
  {
    strategyId: "strategy_fx_momentum",
    activeSignals: 2,
    agg: {
      strategyId: "strategy_fx_momentum",
      totalSignals: 97,
      wins: 65,
      losses: 32,
      breakevens: 0,
      pnlSum: 155.2,
      pnlSumSq: 620,
      rMultipleSum: 126,
      tp1Hits: 76,
      tp2Hits: 50,
      tp3Hits: 20,
    },
  },
  {
    strategyId: "strategy_breakout",
    activeSignals: 1,
    agg: {
      strategyId: "strategy_breakout",
      totalSignals: 121,
      wins: 78,
      losses: 43,
      breakevens: 0,
      pnlSum: 375.1,
      pnlSumSq: 2100, // more volatile -> lower consistency
      rMultipleSum: 210,
      tp1Hits: 91,
      tp2Hits: 59,
      tp3Hits: 34,
    },
  },
  {
    strategyId: "analyst_chidi_o",
    activeSignals: 1,
    agg: {
      strategyId: "analyst_chidi_o",
      totalSignals: 58,
      wins: 41,
      losses: 17,
      breakevens: 0,
      pnlSum: 168.2,
      pnlSumSq: 540,
      rMultipleSum: 104,
      tp1Hits: 46,
      tp2Hits: 32,
      tp3Hits: 17,
    },
  },
];

export const mockPerformance: StrategyPerformance[] = mockAggregates.map(({ agg, activeSignals }) =>
  computePerformance(agg, activeSignals),
);

export const mockSignals: Signal[] = [
  {
    id: "sig_1001",
    symbol: "BTC/USDT",
    market: "crypto",
    direction: "LONG",
    entry: 103500,
    stopLoss: 102400,
    takeProfits: [
      { level: 1, price: 104000, hitAt: "2026-09-06T09:12:00Z" },
      { level: 2, price: 105000, hitAt: null },
      { level: 3, price: 106500, hitAt: null },
    ],
    timeframe: "15m",
    sourceId: "strategy_alpha_momentum",
    strategyId: "strategy_alpha_momentum",
    confidence: 78,
    riskScore: 38,
    riskLevel: "medium",
    premiumOnly: false,
    status: "TP1_HIT",
    createdAt: "2026-09-06T08:40:00Z",
    activatedAt: "2026-09-06T08:41:00Z",
  },
  {
    id: "sig_1002",
    symbol: "EUR/USD",
    market: "forex",
    direction: "SHORT",
    entry: 1.168,
    stopLoss: 1.172,
    takeProfits: [
      { level: 1, price: 1.164, hitAt: null },
      { level: 2, price: 1.16, hitAt: null },
      { level: 3, price: 1.155, hitAt: null },
    ],
    timeframe: "30m",
    sourceId: "strategy_fx_momentum",
    strategyId: "strategy_fx_momentum",
    confidence: 71,
    riskScore: 44,
    riskLevel: "medium",
    premiumOnly: false,
    status: "ACTIVE",
    createdAt: "2026-09-06T10:05:00Z",
    activatedAt: "2026-09-06T10:06:00Z",
  },
  {
    id: "sig_1003",
    symbol: "SOL/USDT",
    market: "crypto",
    direction: "LONG",
    entry: 214.2,
    stopLoss: 208.5,
    takeProfits: [
      { level: 1, price: 219.0, hitAt: "2026-09-05T22:10:00Z" },
      { level: 2, price: 224.0, hitAt: "2026-09-06T01:30:00Z" },
      { level: 3, price: 230.0, hitAt: "2026-09-06T04:15:00Z" },
    ],
    timeframe: "1h",
    sourceId: "strategy_breakout",
    strategyId: "strategy_breakout",
    confidence: 82,
    riskScore: 61,
    riskLevel: "high",
    premiumOnly: false,
    status: "FULL_TP",
    createdAt: "2026-09-05T20:00:00Z",
    activatedAt: "2026-09-05T20:01:00Z",
    closedAt: "2026-09-06T04:15:00Z",
    result: "WIN",
    pnlPercent: 7.4,
  },
  {
    id: "sig_1004",
    symbol: "GBP/USD",
    market: "forex",
    direction: "LONG",
    entry: 1.2645,
    stopLoss: 1.2590,
    takeProfits: [
      { level: 1, price: 1.269, hitAt: null },
      { level: 2, price: 1.2735, hitAt: null },
      { level: 3, price: 1.278, hitAt: null },
    ],
    timeframe: "4h",
    sourceId: "strategy_fx_momentum",
    strategyId: "strategy_fx_momentum",
    confidence: 64,
    riskScore: 52,
    riskLevel: "medium",
    premiumOnly: false,
    status: "SL_HIT",
    createdAt: "2026-09-05T14:00:00Z",
    activatedAt: "2026-09-05T14:01:00Z",
    closedAt: "2026-09-05T19:20:00Z",
    slHitAt: "2026-09-05T19:20:00Z",
    result: "LOSS",
    pnlPercent: -2.1,
  },
  {
    id: "sig_1005",
    symbol: "XAU/USD",
    market: "forex",
    direction: "LONG",
    entry: 2415.5,
    stopLoss: 2398.0,
    takeProfits: [
      { level: 1, price: 2432.0, hitAt: null },
      { level: 2, price: 2448.0, hitAt: null },
      { level: 3, price: 2465.0, hitAt: null },
    ],
    timeframe: "4h",
    sourceId: "analyst_chidi_o",
    strategyId: "analyst_chidi_o",
    confidence: 74,
    riskScore: 47,
    riskLevel: "medium",
    premiumOnly: true,
    note: "Discretionary call — gold basing above the 4h demand zone after CPI.",
    status: "ACTIVE",
    createdAt: "2026-09-06T07:15:00Z",
    activatedAt: "2026-09-06T07:16:00Z",
  },
];

export function getSignalById(id: string): Signal | undefined {
  return mockSignals.find((s) => s.id === id);
}

export function getStrategyById(id: string): Strategy | undefined {
  return mockStrategies.find((s) => s.id === id);
}
