import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { getCurrentPrices } from "@/lib/market-data";
import { evaluateSignal } from "@/lib/tracking-engine";
import { computeRMultiple } from "@/lib/alpha-score";
import type { Signal, StrategyPerformanceAggregate } from "@/lib/types";

const OPEN_STATUSES = ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"];

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never run unsecured
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true; // Vercel Cron's own format
  return request.nextUrl.searchParams.get("secret") === secret; // for external schedulers
}

interface StrategyDelta {
  tp1Hits: number;
  tp2Hits: number;
  tp3Hits: number;
  closedCount: number;
  wins: number;
  losses: number;
  breakevens: number;
  pnlSum: number;
  pnlSumSq: number;
  rMultipleSum: number;
}

function emptyDelta(): StrategyDelta {
  return { tp1Hits: 0, tp2Hits: 0, tp3Hits: 0, closedCount: 0, wins: 0, losses: 0, breakevens: 0, pnlSum: 0, pnlSumSq: 0, rMultipleSum: 0 };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin is not configured." }, { status: 503 });
  }

  const db = adminDb();
  const snap = await db.collection("signals").where("status", "in", OPEN_STATUSES).get();
  const openSignals = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Signal);

  if (openSignals.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, updated: 0 });
  }

  const uniquePairs = Array.from(
    new Map(openSignals.map((s) => [`${s.market}:${s.symbol}`, { symbol: s.symbol, market: s.market }])).values(),
  );
  const prices = await getCurrentPrices(uniquePairs);

  let updated = 0;
  const deltas = new Map<string, StrategyDelta>();
  const getDelta = (strategyId: string) => {
    if (!deltas.has(strategyId)) deltas.set(strategyId, emptyDelta());
    return deltas.get(strategyId)!;
  };

  for (const signal of openSignals) {
    const price = prices.get(`${signal.market}:${signal.symbol}`);
    if (price == null) continue; // no price this cycle — leave untouched, try again next run

    const update = evaluateSignal(signal, price);
    if (!update.changed) continue;

    await db
      .collection("signals")
      .doc(signal.id)
      .update({
        status: update.status,
        takeProfits: update.takeProfits,
        maxFavorableMove: update.maxFavorableMove,
        maxAdverseMove: update.maxAdverseMove,
        ...(update.closedAt ? { closedAt: update.closedAt } : {}),
        ...(update.slHitAt ? { slHitAt: update.slHitAt } : {}),
        ...(update.result !== undefined ? { result: update.result } : {}),
        ...(update.pnlPercent !== undefined ? { pnlPercent: update.pnlPercent } : {}),
      });
    updated += 1;

    // TP-level hits count toward tp-success-rate stats the moment they
    // happen, independent of how the signal eventually closes.
    const delta = getDelta(signal.strategyId);
    for (const tp of update.takeProfits) {
      const wasHitBefore = signal.takeProfits.find((t) => t.level === tp.level)?.hitAt;
      if (tp.hitAt && !wasHitBefore) {
        if (tp.level === 1) delta.tp1Hits += 1;
        if (tp.level === 2) delta.tp2Hits += 1;
        if (tp.level === 3) delta.tp3Hits += 1;
      }
    }

    // Full close stats feed win rate, avg return, R-multiple, and variance
    // (consistency) — the raw material for AlphaScore.
    if (update.closedAt && update.pnlPercent != null) {
      delta.closedCount += 1;
      if (update.result === "WIN") delta.wins += 1;
      else if (update.result === "LOSS") delta.losses += 1;
      else delta.breakevens += 1;

      delta.pnlSum += update.pnlPercent;
      delta.pnlSumSq += update.pnlPercent ** 2;
      delta.rMultipleSum += computeRMultiple(update.pnlPercent, signal.entry, signal.stopLoss);
    }
  }

  for (const [strategyId, delta] of deltas) {
    if (Object.values(delta).every((v) => v === 0)) continue; // nothing changed for this strategy
    const ref = db.collection("strategy_performance").doc(strategyId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const current = (doc.exists ? doc.data() : null) as StrategyPerformanceAggregate | null;
      const base: StrategyPerformanceAggregate = current ?? {
        strategyId,
        totalSignals: 0,
        wins: 0,
        losses: 0,
        breakevens: 0,
        pnlSum: 0,
        pnlSumSq: 0,
        rMultipleSum: 0,
        tp1Hits: 0,
        tp2Hits: 0,
        tp3Hits: 0,
      };

      const next: StrategyPerformanceAggregate = {
        strategyId,
        totalSignals: base.totalSignals + delta.closedCount,
        wins: base.wins + delta.wins,
        losses: base.losses + delta.losses,
        breakevens: base.breakevens + delta.breakevens,
        pnlSum: base.pnlSum + delta.pnlSum,
        pnlSumSq: base.pnlSumSq + delta.pnlSumSq,
        rMultipleSum: base.rMultipleSum + delta.rMultipleSum,
        tp1Hits: base.tp1Hits + delta.tp1Hits,
        tp2Hits: base.tp2Hits + delta.tp2Hits,
        tp3Hits: base.tp3Hits + delta.tp3Hits,
      };

      tx.set(ref, next, { merge: true });
    });
  }

  return NextResponse.json({ ok: true, checked: openSignals.length, updated });
}
