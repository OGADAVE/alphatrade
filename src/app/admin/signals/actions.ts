"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/get-server-user";
import { logAdminAction } from "@/lib/audit-log";

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
