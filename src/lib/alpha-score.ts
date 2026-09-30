import type { StrategyPerformanceAggregate, StrategyPerformance } from "./types";

/**
 * AlphaScore weights — agreed composite: win rate matters most, then
 * realized reward:risk, then consistency (penalizing wild swings even at
 * a decent win rate), then a sample-size confidence dampener so a 90%
 * win rate on 4 signals can't outrank 65% on 400.
 */
const WEIGHTS = {
  winRate: 0.4,
  rewardRisk: 0.25,
  consistency: 0.2,
  confidence: 0.15,
};

// Reward:risk normalization range. An average realized R of -1 (losing the
// full stop on every trade) maps to 0; +3R average maps to 100. Everything
// in between is linear. Tune these two numbers if real data skews the range.
const RR_FLOOR = -1;
const RR_CEILING = 3;

// Consistency: converts stddev of pnlPercent into a 0-100 score. Every 1
// point of stddev costs this many score points — a strategy whose returns
// swing ±10% will score much lower here than one that steadily nets ±2%,
// even at the same win rate. Tune STDDEV_PENALTY as real return data comes in.
const STDDEV_PENALTY = 4;

// Confidence: exponential saturation curve. SATURATION_N controls how many
// closed signals it takes to approach full confidence — at N signals closed,
// confidence is ~63%; by ~3xN it's ~95%.
const SATURATION_N = 30;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function winRateScore(aggregate: StrategyPerformanceAggregate): number {
  if (aggregate.totalSignals === 0) return 0;
  return (aggregate.wins / aggregate.totalSignals) * 100;
}

function rewardRiskScore(avgRMultiple: number): number {
  const pct = (avgRMultiple - RR_FLOOR) / (RR_CEILING - RR_FLOOR);
  return clamp(pct * 100, 0, 100);
}

function consistencyScore(returnStdDev: number): number {
  return clamp(100 - returnStdDev * STDDEV_PENALTY, 0, 100);
}

function confidenceScore(totalSignals: number): number {
  return clamp(100 * (1 - Math.exp(-totalSignals / SATURATION_N)), 0, 100);
}

/**
 * Derives the full read-side StrategyPerformance (including AlphaScore)
 * from the raw stored aggregate. `activeSignals` is passed in separately
 * since it's a live count from the signals collection, not part of the
 * closed-signal aggregate.
 */
export function computePerformance(
  aggregate: StrategyPerformanceAggregate,
  activeSignals: number,
): StrategyPerformance {
  const { totalSignals, wins, pnlSum, pnlSumSq, rMultipleSum, tp1Hits, tp2Hits, tp3Hits } = aggregate;

  // A strategy with zero closed signals isn't "average" — it's untested.
  // Without this, an empty aggregate would earn ~25 points of AlphaScore
  // from trivial "zero variance" consistency and "neutral" R:R on data
  // that doesn't exist. Report it plainly as unranked instead.
  if (totalSignals === 0) {
    return {
      strategyId: aggregate.strategyId,
      totalSignals: 0,
      wins: 0,
      losses: aggregate.losses,
      winRate: 0,
      avgReturnPercent: 0,
      avgRMultiple: 0,
      returnStdDev: 0,
      tp1SuccessRate: 0,
      tp2SuccessRate: 0,
      tp3SuccessRate: 0,
      activeSignals,
      alphaScore: 0,
      alphaScoreBreakdown: { winRateScore: 0, rewardRiskScore: 0, consistencyScore: 0, confidenceScore: 0 },
    };
  }

  const winRate = (wins / totalSignals) * 100;
  const avgReturnPercent = pnlSum / totalSignals;
  const avgRMultiple = rMultipleSum / totalSignals;

  // Population variance from sum/sum-of-squares, then stddev.
  const variance = pnlSumSq / totalSignals - avgReturnPercent ** 2;
  const returnStdDev = Math.sqrt(Math.max(0, variance));

  const wrScore = winRateScore(aggregate);
  const rrScore = rewardRiskScore(avgRMultiple);
  const consScore = consistencyScore(returnStdDev);
  const confScore = confidenceScore(totalSignals);

  const alphaScore = Math.round(
    wrScore * WEIGHTS.winRate +
      rrScore * WEIGHTS.rewardRisk +
      consScore * WEIGHTS.consistency +
      confScore * WEIGHTS.confidence,
  );

  return {
    strategyId: aggregate.strategyId,
    totalSignals,
    wins,
    losses: aggregate.losses,
    winRate,
    avgReturnPercent,
    avgRMultiple,
    returnStdDev,
    tp1SuccessRate: (tp1Hits / totalSignals) * 100,
    tp2SuccessRate: (tp2Hits / totalSignals) * 100,
    tp3SuccessRate: (tp3Hits / totalSignals) * 100,
    activeSignals,
    alphaScore: clamp(alphaScore, 0, 100),
    alphaScoreBreakdown: {
      winRateScore: Math.round(wrScore),
      rewardRiskScore: Math.round(rrScore),
      consistencyScore: Math.round(consScore),
      confidenceScore: Math.round(confScore),
    },
  };
}

/** R-multiple for one closed signal: realized P/L relative to the risk taken at entry. */
export function computeRMultiple(pnlPercent: number, entry: number, stopLoss: number): number {
  const riskPercent = (Math.abs(entry - stopLoss) / entry) * 100;
  if (riskPercent === 0) return 0;
  return pnlPercent / riskPercent;
}
