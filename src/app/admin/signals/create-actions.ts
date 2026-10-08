"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/get-server-user";
import { logAdminAction } from "@/lib/audit-log";
import { normalizeSignal, validateNormalizedSignal, isDuplicateSignal } from "@/lib/signal-pipeline";
import type { RawSignalInput } from "@/lib/signal-pipeline";
import type { Market, Signal } from "@/lib/types";

// Every manually created signal shares one source/strategy so they roll
// up into a single "Official AlphaTrade Signals" track record (spec
// section 7: admin-created signals get their own statistics, separate
// from automated strategies) — regardless of which admin account posted
// it. Per-admin attribution still shows via createdByUid/createdByEmail.
const ADMIN_SOURCE_ID = "admin";
const ADMIN_STRATEGY_ID = "strategy_admin_signals";

const OPEN_STATUSES = ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"];

export async function createManualSignal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  const market = String(formData.get("market") ?? "crypto") as Market;
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const direction = String(formData.get("direction") ?? "LONG");
  const entry = formData.get("entry");
  const stopLoss = formData.get("stopLoss");
  const tp1 = formData.get("tp1");
  const tp2 = formData.get("tp2");
  const tp3 = formData.get("tp3");
  const timeframe = String(formData.get("timeframe") ?? "15m");
  const confidence = formData.get("confidence");
  const note = String(formData.get("note") ?? "").trim();
  const publishNow = formData.get("publishNow") === "on";

  const takeProfits = [tp1, tp2, tp3]
    .map((v) => (v ? Number(v) : null))
    .filter((n): n is number => n !== null && Number.isFinite(n));

  const raw: RawSignalInput = {
    symbol,
    market,
    direction,
    entry,
    stopLoss,
    takeProfits,
    timeframe,
    confidence: confidence ? Number(confidence) : 70,
    note: note || undefined,
  };

  const normalized = normalizeSignal(raw, { sourceId: ADMIN_SOURCE_ID, strategyId: ADMIN_STRATEGY_ID });
  const validation = validateNormalizedSignal(normalized);
  if (!validation.valid) {
    throw new Error(`Signal failed validation: ${validation.errors.join(" ")}`);
  }

  const db = adminDb();

  const openSnap = await db
    .collection("signals")
    .where("sourceId", "==", ADMIN_SOURCE_ID)
    .where("status", "in", OPEN_STATUSES)
    .get();
  const openSignals = openSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Signal);

  if (isDuplicateSignal(normalized, openSignals)) {
    throw new Error("An equivalent open signal already exists for this source.");
  }

  const now = new Date().toISOString();
  const { id: _discard, ...signalData } = normalized;
  void _discard;

  const finalSignal = {
    ...signalData,
    // normalizeSignal defaults every signal to ACTIVE — override to a
    // draft if the admin chose "Save as draft" instead of publishing.
    status: publishNow ? signalData.status : ("PENDING" as const),
    activatedAt: publishNow ? now : undefined,
    createdByUid: admin.uid,
    createdByEmail: admin.email ?? undefined,
  };

  const docRef = await db.collection("signals").add(finalSignal);

  await logAdminAction({
    actorUid: admin.uid,
    action: publishNow ? "SIGNAL_CREATED_MANUALLY_PUBLISHED" : "SIGNAL_CREATED_MANUALLY_DRAFT",
    targetType: "signal",
    targetId: docRef.id,
    details: `${symbol} ${direction} entry ${normalized.entry} — ${publishNow ? "published" : "saved as draft"}`,
  });

  revalidatePath("/admin/signals");
  revalidatePath("/");
  revalidatePath("/crypto");
  revalidatePath("/forex");
}

/** Publishes an existing draft (PENDING) signal — the admin's "approve and go live" action. */
export async function publishDraftSignal(signalId: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  await adminDb()
    .collection("signals")
    .doc(signalId)
    .update({ status: "ACTIVE", activatedAt: new Date().toISOString() });

  await logAdminAction({
    actorUid: admin.uid,
    action: "SIGNAL_DRAFT_PUBLISHED",
    targetType: "signal",
    targetId: signalId,
    details: "Draft published to ACTIVE.",
  });

  revalidatePath("/admin/signals");
  revalidatePath("/");
  revalidatePath("/crypto");
  revalidatePath("/forex");
} 