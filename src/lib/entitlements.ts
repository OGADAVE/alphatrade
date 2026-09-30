import "server-only";
import { adminDb } from "./firebase-admin";
import type { Signal, Subscription } from "./types";

export interface Entitlement {
  plan: "FREE" | "PREMIUM";
}

/**
 * Reads subscriptions/{uid} — the doc only the Paystack webhook writes —
 * and decides the caller's current plan. `active` requires both
 * status === "ACTIVE" and (no currentPeriodEnd, or it hasn't passed), so a
 * subscription that lapsed without a webhook firing yet doesn't grant
 * indefinite access.
 */
export async function getEntitlement(uid: string | null): Promise<Entitlement> {
  if (!uid) return { plan: "FREE" };

  const doc = await adminDb().collection("subscriptions").doc(uid).get();
  if (!doc.exists) return { plan: "FREE" };

  const sub = doc.data() as Subscription;
  const notExpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();
  const active = sub.status === "ACTIVE" && sub.plan === "PREMIUM" && notExpired;

  return { plan: active ? "PREMIUM" : "FREE" };
}

/**
 * Redacts the actionable fields (entry, stopLoss, takeProfits, note) on a
 * premium-only signal for a non-premium viewer. Result/pnl/status stay
 * visible — the point is hiding "how to trade it", not the track record,
 * which is the actual product hook for upgrading. This must run at every
 * boundary that hands signal data to an end user (pages AND API routes) —
 * it does not live inside signals-data.ts because admin views must never
 * be redacted, and admin reads share those same functions.
 */
export function applyEntitlement(signal: Signal, entitlement: Entitlement): Signal {
  const locked = signal.premiumOnly && entitlement.plan !== "PREMIUM";
  if (!locked) return { ...signal, restricted: false };

  return {
    ...signal,
    entry: 0,
    stopLoss: 0,
    takeProfits: [],
    note: undefined,
    restricted: true,
  };
}

export function applyEntitlementToAll(signals: Signal[], entitlement: Entitlement): Signal[] {
  return signals.map((s) => applyEntitlement(s, entitlement));
}
