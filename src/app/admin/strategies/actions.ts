"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/get-server-user";
import { logAdminAction } from "@/lib/audit-log";
import type { Market, RiskLevel } from "@/lib/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createStrategy(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const market = String(formData.get("market") ?? "crypto") as Market | "both";
  const riskLevel = String(formData.get("riskLevel") ?? "medium") as RiskLevel;
  const instruments = String(formData.get("instruments") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name) throw new Error("Strategy name is required.");

  const id = slugify(name) || `strategy_${Date.now()}`;

  await adminDb()
    .collection("strategies")
    .doc(id)
    .set({
      name,
      description,
      market,
      riskLevel,
      instruments,
      timeframes: [],
      active: true,
    });

  await logAdminAction({
    actorUid: admin.uid,
    action: "STRATEGY_CREATED",
    targetType: "strategy",
    targetId: id,
    details: `Created strategy "${name}"`,
  });

  revalidatePath("/admin/strategies");
}

export async function toggleStrategyActive(strategyId: string, active: boolean) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  await adminDb().collection("strategies").doc(strategyId).update({ active });

  await logAdminAction({
    actorUid: admin.uid,
    action: active ? "STRATEGY_ACTIVATED" : "STRATEGY_DEACTIVATED",
    targetType: "strategy",
    targetId: strategyId,
    details: `Set active=${active}`,
  });

  revalidatePath("/admin/strategies");
}
