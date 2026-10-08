import type { Signal, SignalStatus } from "./types";
import { roundTo } from "./format";

export interface TrackingUpdate {
  changed: boolean;
  status: SignalStatus;
  takeProfits: Signal["takeProfits"];
  closedAt?: string;
  slHitAt?: string;
  result?: "WIN" | "LOSS" | "BREAKEVEN" | null;
  pnlPercent?: number | null;
  maxFavorableMove: number;
  maxAdverseMove: number;
}

function pnlPercentAt(signal: Signal, price: number): number {
  const raw = ((price - signal.entry) / signal.entry) * 100;
  return roundTo(signal.direction === "LONG" ? raw : -raw, 2);
}

const TERMINAL_STATUSES: SignalStatus[] = ["FULL_TP", "SL_HIT", "CANCELLED", "EXPIRED", "CLOSED"];

/**
 * Evaluates one signal against a fresh market price and returns the
 * updates to persist. Does not mutate the input signal or touch Firestore
 * — the caller (the cron route) is responsible for both.
 */
export function evaluateSignal(signal: Signal, currentPrice: number): TrackingUpdate {
  if (TERMINAL_STATUSES.includes(signal.status)) {
    return {
      changed: false,
      status: signal.status,
      takeProfits: signal.takeProfits,
      maxFavorableMove: signal.maxFavorableMove ?? 0,
      maxAdverseMove: signal.maxAdverseMove ?? 0,
    };
  }

  const now = new Date().toISOString();
  const currentPnl = pnlPercentAt(signal, currentPrice);

  const maxFavorableMove = Math.max(signal.maxFavorableMove ?? 0, currentPnl);
  const maxAdverseMove = Math.min(signal.maxAdverseMove ?? 0, currentPnl);

  // Stop loss check first — a signal that gaps through SL and past a TP in
  // the same check should still be treated as stopped out, not a win.
  const slHit = signal.direction === "LONG" ? currentPrice <= signal.stopLoss : currentPrice >= signal.stopLoss;

  if (slHit) {
    return {
      changed: true,
      status: "SL_HIT",
      takeProfits: signal.takeProfits,
      closedAt: now,
      slHitAt: now,
      result: currentPnl > 0 ? "WIN" : currentPnl < 0 ? "LOSS" : "BREAKEVEN",
      pnlPercent: currentPnl,
      maxFavorableMove,
      maxAdverseMove,
    };
  }

  // Mark any newly-reached TP levels.
  let changed = false;
  const updatedTps = signal.takeProfits.map((tp) => {
    if (tp.hitAt) return tp;
    const hit = signal.direction === "LONG" ? currentPrice >= tp.price : currentPrice <= tp.price;
    if (hit) {
      changed = true;
      return { ...tp, hitAt: now };
    }
    return tp;
  });

  const hitLevels = updatedTps.filter((tp) => tp.hitAt).map((tp) => tp.level);
  const allHit = updatedTps.length > 0 && updatedTps.every((tp) => tp.hitAt);

  let status: SignalStatus = signal.status;
  let closedAt: string | undefined;
  let result: TrackingUpdate["result"];
  let pnlPercent: number | null | undefined;

  if (allHit) {
    status = "FULL_TP";
    closedAt = now;
    result = "WIN";
    pnlPercent = currentPnl;
    changed = true;
  } else if (hitLevels.length > 0) {
    const highest = Math.max(...hitLevels) as 1 | 2 | 3;
    status = (`TP${highest}_HIT` as SignalStatus);
  }

  if (!changed && maxFavorableMove === (signal.maxFavorableMove ?? 0) && maxAdverseMove === (signal.maxAdverseMove ?? 0)) {
    return {
      changed: false,
      status: signal.status,
      takeProfits: signal.takeProfits,
      maxFavorableMove,
      maxAdverseMove,
    };
  }

  return {
    changed: true,
    status,
    takeProfits: updatedTps,
    closedAt,
    result,
    pnlPercent,
    maxFavorableMove,
    maxAdverseMove,
  };
}