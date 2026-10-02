"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/get-server-user";
import { logAdminAction } from "@/lib/audit-log";
import { isDuplicateSignal, normalizeSignal, validateNormalizedSignal } from "@/lib/signal-pipeline";
import type { Signal } from "@/lib/types";

export type ManualSignalState = {
  ok: boolean;
  message: string;
};

export async function createManualSignal(
  _previousState: ManualSignalState,
  formData: FormData,
): Promise<ManualSignalState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Admin access required." };

  const market = String(formData.get("market") ?? "").trim().toLowerCase();
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const direction = String(formData.get("direction") ?? "").trim().toUpperCase();
  const strategyId = String(formData.get("strategyId") ?? "").trim();
  const timeframe = String(formData.get("timeframe") ?? "").trim().toLowerCase();
  const entry = String(formData.get("entry") ?? "").trim();
  const stopLoss = String(formData.get("stopLoss") ?? "").trim();
  const confidence = String(formData.get("confidence") ?? "60").trim();
  const note = String(formData.get("note") ?? "").trim();
  const premiumOnly = formData.get("premiumOnly") === "on";

  const takeProfits = [1, 2, 3]
    .map((level) => String(formData.get(`tp${level}`) ?? "").trim())
    .filter(Boolean);

  if (!strategyId) {
    return { ok: false, message: "Select a strategy." };
  }

  const raw = {
    market,
    symbol,
    direction,
    entry,
    stopLoss,
    takeProfits,
    timeframe,
    confidence,
    note,
    premiumOnly,
  };

  let signal: Signal;
  try {
    signal = normalizeSignal(raw, {
      sourceId: "admin_manual",
      strategyId,
    });
  } catch {
    return { ok: false, message: "Signal could not be normalized. Check the numeric fields." };
  }

  const validation = validateNormalizedSignal(signal);
  if (!validation.valid) {
    return { ok: false, message: validation.errors.join(" ") };
  }

  const db = adminDb();

  // Keep the manual source visible and explicitly classified as an admin source.
  await db.collection("signal_sources").doc("admin_manual").set(
    {
      name: "Admin Manual Signals",
      type: "admin",
      authorized: true,
      active: true,
      connectionDetails: "Created through the protected Admin → Signals form.",
    },
    { merge: true },
  );

  const openSnap = await db
    .collection("signals")
    .where("status", "in", ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"])
    .get();
  const openSignals = openSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Signal);

  if (isDuplicateSignal(signal, openSignals)) {
    return {
      ok: false,
      message: "A matching open manual signal already exists for this symbol, direction, and entry.",
    };
  }

  const ref = db.collection("signals").doc();
  signal.id = ref.id;
  await ref.set(signal);

  await logAdminAction({
    actorUid: admin.uid,
    action: "SIGNAL_CREATED_MANUALLY",
    targetType: "signal",
    targetId: ref.id,
    details: `${signal.direction} ${signal.symbol} @ ${signal.entry}; strategy=${signal.strategyId}; premiumOnly=${signal.premiumOnly}`,
  });

  revalidatePath("/");
  revalidatePath("/crypto");
  revalidatePath("/forex");
  revalidatePath("/history");
  revalidatePath("/admin/signals");

  return { ok: true, message: `Signal created successfully: ${signal.symbol} ${signal.direction}.` };
}

export async function cancelSignal(signalId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  await adminDb().collection("signals").doc(signalId).update({
    status: "CANCELLED",
    closedAt: new Date().toISOString(),
  });

  await logAdminAction({
    actorUid: admin.uid,
    action: "SIGNAL_CANCELLED",
    targetType: "signal",
    targetId: signalId,
    details: reason || "No reason given.",
  });

  revalidatePath("/admin/signals");
}

export async function closeSignal(signalId: string) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  await adminDb().collection("signals").doc(signalId).update({
    status: "CLOSED",
    closedAt: new Date().toISOString(),
  });

  await logAdminAction({
    actorUid: admin.uid,
    action: "SIGNAL_CLOSED",
    targetType: "signal",
    targetId: signalId,
    details: "Manually closed by admin (no automatic TP/SL result).",
  });

  revalidatePath("/admin/signals");
}

export async function modifyStopLoss(signalId: string, newStopLoss: number) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  const ref = adminDb().collection("signals").doc(signalId);
  const doc = await ref.get();
  const oldStopLoss = doc.data()?.stopLoss;

  await ref.update({ stopLoss: newStopLoss });

  await logAdminAction({
    actorUid: admin.uid,
    action: "SIGNAL_SL_MODIFIED",
    targetType: "signal",
    targetId: signalId,
    details: `Old SL: ${oldStopLoss} -> New SL: ${newStopLoss}`,
  });

  revalidatePath("/admin/signals");
}

export async function markInvalid(signalId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  await adminDb().collection("signals").doc(signalId).update({
    status: "CANCELLED",
    closedAt: new Date().toISOString(),
    note: `Marked invalid by admin: ${reason || "no reason given"}`,
  });

  await logAdminAction({
    actorUid: admin.uid,
    action: "SIGNAL_MARKED_INVALID",
    targetType: "signal",
    targetId: signalId,
    details: reason || "No reason given.",
  });

  revalidatePath("/admin/signals");
}
