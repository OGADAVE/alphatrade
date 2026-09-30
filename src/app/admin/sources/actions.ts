"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/get-server-user";
import { logAdminAction } from "@/lib/audit-log";
import type { SourceType } from "@/lib/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createSource(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "external_api") as SourceType;
  if (!name) throw new Error("Source name is required.");

  const id = slugify(name) || randomBytes(4).toString("hex");
  const needsApiKey = type === "external_api";
  const apiKey = needsApiKey ? randomBytes(24).toString("hex") : undefined;

  await adminDb()
    .collection("signal_sources")
    .doc(id)
    .set({
      name,
      type,
      authorized: true,
      active: true,
      ...(apiKey ? { apiKey } : {}),
    });

  await logAdminAction({
    actorUid: admin.uid,
    action: "SOURCE_CREATED",
    targetType: "source",
    targetId: id,
    details: `Created source "${name}" (${type})`,
  });

  revalidatePath("/admin/sources");
}

export async function toggleSourceField(sourceId: string, field: "active" | "authorized", value: boolean) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");

  await adminDb().collection("signal_sources").doc(sourceId).update({ [field]: value });

  await logAdminAction({
    actorUid: admin.uid,
    action: value ? `SOURCE_${field.toUpperCase()}_ENABLED` : `SOURCE_${field.toUpperCase()}_DISABLED`,
    targetType: "source",
    targetId: sourceId,
    details: `Set ${field}=${value} on source ${sourceId}`,
  });

  revalidatePath("/admin/sources");
}
