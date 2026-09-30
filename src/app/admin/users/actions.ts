"use server";

import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/get-server-user";
import { logAdminAction } from "@/lib/audit-log";

export async function setUserSuspended(uid: string, suspended: boolean) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Admin access required.");
  if (uid === admin.uid) throw new Error("You can't suspend your own account.");

  // Disabling the actual Auth account is what makes this real — a
  // "suspended" flag with no enforcement is cosmetic. A disabled user's
  // existing session cookies stop verifying on their next request.
  await adminAuth().updateUser(uid, { disabled: suspended });
  await adminDb().collection("users").doc(uid).update({ suspended });

  await logAdminAction({
    actorUid: admin.uid,
    action: suspended ? "USER_SUSPENDED" : "USER_ACTIVATED",
    targetType: "user",
    targetId: uid,
    details: suspended ? "Account disabled." : "Account re-enabled.",
  });

  revalidatePath("/admin/users");
}
