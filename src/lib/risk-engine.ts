import type { Direction, RiskLevel } from "./types";

interface RiskInput {
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfits: number[]; // ordered price levels
  confidence: number; // 1-100
}

/**
 * Produces a 0-100 risk score (higher = riskier) from three factors:
 *  - stop distance relative to entry (wider stop = more risk per unit size)
 *  - reward:risk ratio using the first take-profit target (worse ratio = more risk)
 *  - inverse of the source's stated confidence
 *
 * This is a starting heuristic, not a finished quant model — it exists so
 * every signal has a consistent, explainable risk figure from day one.
 * Swap in a more sophisticated model (volatility-adjusted, ATR-based, etc.)
 * without changing the Signal shape or any caller of this function.
 */
export function computeRisk(input: RiskInput): { riskScore: number; riskLevel: RiskLevel } {
  const { direction, entry, stopLoss, takeProfits, confidence } = input;

  const stopDistancePercent = (Math.abs(entry - stopLoss) / entry) * 100;
  // Wider stops score higher risk; cap the contribution at 40 points.
  const stopRisk = Math.min(stopDistancePercent * 8, 40);

  const firstTp = takeProfits[0];
  let rewardRiskRisk = 20; // neutral default if no TP given
  if (firstTp) {
    const reward = Math.abs(firstTp - entry);
    const risk = Math.abs(entry - stopLoss) || 1;
    const ratio = reward / risk; // >1 means reward exceeds risk
    // Ratio of 3:1 -> low contribution; ratio of 0.5:1 -> high contribution.
    rewardRiskRisk = Math.max(0, Math.min(40, 40 - ratio * 10));
  }

  const confidenceRisk = Math.max(0, Math.min(20, (100 - confidence) * 0.2));

  const riskScore = Math.round(stopRisk + rewardRiskRisk + confidenceRisk);
  const clamped = Math.max(0, Math.min(100, riskScore));

  const riskLevel: RiskLevel = clamped < 34 ? "low" : clamped < 67 ? "medium" : "high";

  // direction doesn't currently change the math (long/short risk is
  // symmetric here) but is accepted so a future asymmetric model — e.g.
  // shorts scored higher in a structurally bullish market — is a
  // same-signature change.
  void direction;

  return { riskScore: clamped, riskLevel };
}
