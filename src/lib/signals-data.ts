import "server-only";
import { adminDb, isAdminConfigured } from "./firebase-admin";
import { mockSignals, mockStrategies, mockPerformance } from "./mock-data";
import { computePerformance } from "./alpha-score";
import type { Signal, Strategy, StrategyPerformance, StrategyPerformanceAggregate } from "./types";

const OPEN_STATUSES = ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"];

async function tryFirestore<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isAdminConfigured()) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error("Firestore read failed, falling back to mock data:", err);
    return fallback;
  }
}

export async function getSignals(): Promise<Signal[]> {
  return tryFirestore(async () => {
    const snap = await adminDb().collection("signals").orderBy("createdAt", "desc").limit(100).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Signal);
  }, mockSignals);
}

export async function getSignalById(id: string): Promise<Signal | undefined> {
  return tryFirestore(async () => {
    const doc = await adminDb().collection("signals").doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as Signal;
  }, mockSignals.find((s) => s.id === id));
}

export async function getStrategies(): Promise<Strategy[]> {
  return tryFirestore(async () => {
    const snap = await adminDb().collection("strategies").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Strategy);
  }, mockStrategies);
}

export async function getStrategyById(id: string): Promise<Strategy | undefined> {
  const strategies = await getStrategies();
  return strategies.find((s) => s.id === id);
}

export async function getStrategyPerformance(): Promise<StrategyPerformance[]> {
  return tryFirestore(async () => {
    const [perfSnap, openSnap] = await Promise.all([
      adminDb().collection("strategy_performance").get(),
      adminDb().collection("signals").where("status", "in", OPEN_STATUSES).get(),
    ]);
    if (perfSnap.empty) return mockPerformance;

    const activeByStrategy = new Map<string, number>();
    for (const doc of openSnap.docs) {
      const strategyId = doc.data().strategyId as string | undefined;
      if (!strategyId) continue;
      activeByStrategy.set(strategyId, (activeByStrategy.get(strategyId) ?? 0) + 1);
    }

    return perfSnap.docs.map((d) => {
      const aggregate = { strategyId: d.id, ...d.data() } as StrategyPerformanceAggregate;
      return computePerformance(aggregate, activeByStrategy.get(d.id) ?? 0);
    });
  }, mockPerformance);
}
